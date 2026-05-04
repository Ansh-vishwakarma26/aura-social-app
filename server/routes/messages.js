const router = require('express').Router();
const { pool, formatUser } = require('../database');
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
router.get('/', authenticate, async (req, res) => {
  const uid = req.user.id;

  // We want to find the latest message for each conversation we're part of.
  // Postgres has GREATEST(), but the logic here works too.
  const result = await pool.query(`
    SELECT 
      m.*, 
      u.id as other_user_id, u.username, u.full_name, u.avatar_url,
      (
        SELECT COUNT(*)
        FROM messages m2
        WHERE (m2.sender_id = $1 AND m2.receiver_id = u.id)
           OR (m2.sender_id = u.id AND m2.receiver_id = $1)
      ) as chat_frequency
    FROM messages m
    JOIN users u ON u.id = CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
    WHERE m.id IN (
      SELECT MAX(id)
      FROM messages
      WHERE sender_id = $1 OR receiver_id = $1
      GROUP BY CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END
    )
    ORDER BY chat_frequency DESC, m.created_at DESC
  `, [uid]);

  const conversations = result.rows.map(r => {
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
router.get('/:username', authenticate, async (req, res) => {
  const uid = req.user.id;
  const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [req.params.username]);
  const otherUser = userResult.rows[0];
  if (!otherUser) return res.status(404).json({ message: 'User not found' });

  // Mark all unread messages from this user as read
  await pool.query('UPDATE messages SET is_read = 1 WHERE sender_id = $1 AND receiver_id = $2 AND is_read = 0', [otherUser.id, uid]);

  const result = await pool.query(`
    SELECT * FROM messages
    WHERE (sender_id = $1 AND receiver_id = $2)
       OR (sender_id = $2 AND receiver_id = $1)
    ORDER BY created_at ASC
  `, [uid, otherUser.id]);

  res.json({
    user: await formatUser(otherUser),
    messages: result.rows.map(m => formatMessage(m, uid))
  });
});

// ─── POST /api/messages/:username ────────────────────────────────────────────
// Send a message to a specific user
router.post('/:username', authenticate, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ message: 'Message text required' });

  const uid = req.user.id;
  const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [req.params.username]);
  const otherUser = userResult.rows[0];
  if (!otherUser) return res.status(404).json({ message: 'User not found' });

  const result = await pool.query(`
    INSERT INTO messages (sender_id, receiver_id, text) VALUES ($1, $2, $3) RETURNING *
  `, [uid, otherUser.id, text.trim()]);

  const newMsg = result.rows[0];
  res.status(201).json({ message: formatMessage(newMsg, uid) });
});

module.exports = router;
