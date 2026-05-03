const router = require('express').Router();
const { db, timeAgo } = require('../database');
const { authenticate } = require('../middleware/auth');

// GET /api/notifications
router.get('/', authenticate, (req, res) => {
  const rows = db.prepare(`
    SELECT n.*,
      a.username as actor_username, a.full_name as actor_full_name, a.avatar_url as actor_avatar,
      p.image_url as post_image, p.id as post_id_val
    FROM notifications n
    JOIN users a ON n.actor_id = a.id
    LEFT JOIN posts p ON n.post_id = p.id
    WHERE n.recipient_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all(req.user.id);

  res.json({
    notifications: rows.map(n => ({
      id: String(n.id),
      type: n.type,
      isRead: !!n.is_read,
      timestamp: timeAgo(n.created_at),
      text: n.text,
      user: {
        id: String(n.actor_id),
        username: n.actor_username,
        fullName: n.actor_full_name,
        avatar: n.actor_avatar || '',
      },
      post: n.post_id ? {
        id: String(n.post_id_val),
        image: n.post_image || '',
      } : null,
    }))
  });
});

// PUT /api/notifications/read
router.put('/read', authenticate, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE recipient_id = ?').run(req.user.id);
  res.json({ success: true });
});

// GET /api/notifications/unread-count
router.get('/unread-count', authenticate, (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE recipient_id = ? AND is_read = 0').get(req.user.id).c;
  res.json({ count });
});

module.exports = router;
