const router = require('express').Router();
const { db, formatUser } = require('../database');
const { authenticate } = require('../middleware/auth');

// ─── Helper to format a message ──────────────────────────────────────────────
function formatMessage(msg, currentUserId) {
  return {
    id: String(msg.id),
    senderId: String(msg.sender_id),
    receiverId: String(msg.receiver_id),
    text: msg.text,
    isRead: !!msg.is_read,
    isMine: msg.sender_id === currentUserId,
    createdAt: msg.created_at,
  };
}

// ─── GET /api/messages ───────────────────────────────────────────────────────
// Get all active conversations (grouped by user, showing latest message)
router.get('/', authenticate, (req, res) => {
  const uid = req.user.id;

  // We want to find the latest message for each conversation we're part of.
  // SQLite doesn't have GREATEST(), so we do a union and group by the other user's id.
  const rows = db.prepare(`
    SELECT 
      m.*, 
      u.id as other_user_id, u.username, u.full_name, u.avatar_url,
      (
        SELECT COUNT(*)
        FROM messages m2
        WHERE (m2.sender_id = @uid AND m2.receiver_id = u.id)
           OR (m2.sender_id = u.id AND m2.receiver_id = @uid)
      ) as chat_frequency
    FROM messages m
    JOIN users u ON u.id = CASE WHEN m.sender_id = @uid THEN m.receiver_id ELSE m.sender_id END
    WHERE m.id IN (
      SELECT MAX(id)
      FROM messages
      WHERE sender_id = @uid OR receiver_id = @uid
      GROUP BY CASE WHEN sender_id = @uid THEN receiver_id ELSE sender_id END
    )
    ORDER BY chat_frequency DESC, m.created_at DESC
  `).all({ uid });

  const conversations = rows.map(r => {
    const msg = formatMessage(r, uid);
    return {
      user: {
        id: String(r.other_user_id),
        username: r.username,
        fullName: r.full_name,
        avatar: r.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.full_name)}&background=18181b&color=ffffff`,
      },
      latestMessage: msg,
      unreadCount: msg.receiverId === String(uid) && !msg.isRead ? 1 : 0 // Simplified unread
    };
  });

  res.json({ conversations });
});

// ─── GET /api/messages/:username ─────────────────────────────────────────────
// Get full chat history with a specific user
router.get('/:username', authenticate, (req, res) => {
  const uid = req.user.id;
  const otherUser = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!otherUser) return res.status(404).json({ message: 'User not found' });

  // Mark all unread messages from this user as read
  db.prepare('UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0').run(otherUser.id, uid);

  const messages = db.prepare(`
    SELECT * FROM messages
    WHERE (sender_id = @uid AND receiver_id = @otherId)
       OR (sender_id = @otherId AND receiver_id = @uid)
    ORDER BY created_at ASC
  `).all({ uid, otherId: otherUser.id });

  res.json({
    user: formatUser(otherUser),
    messages: messages.map(m => formatMessage(m, uid))
  });
});

// ─── POST /api/messages/:username ────────────────────────────────────────────
// Send a message to a specific user
router.post('/:username', authenticate, (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ message: 'Message text required' });

  const uid = req.user.id;
  const otherUser = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!otherUser) return res.status(404).json({ message: 'User not found' });

  const result = db.prepare(`
    INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)
  `).run(uid, otherUser.id, text.trim());

  const newMsg = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: formatMessage(newMsg, uid) });
});

module.exports = router;
