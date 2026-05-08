const router = require('express').Router();
const { pool, timeAgo, resolveUrl } = require('../database');
const { authenticate } = require('../middleware/auth');

// GET /api/notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*,
        a.username as actor_username, a.full_name as actor_full_name, a.avatar_url as actor_avatar,
        p.image_url as post_image, p.id as post_id_val
      FROM notifications n
      JOIN users a ON n.actor_id = a.id
      LEFT JOIN posts p ON n.post_id = p.id
      WHERE n.recipient_id = $1
      ORDER BY n.created_at DESC
      LIMIT 50
    `, [req.user.id]);

    res.json({
      notifications: result.rows.map(n => ({
        id: String(n.id),
        type: n.type,
        isRead: !!n.is_read,
        timestamp: timeAgo(n.created_at),
        text: n.text,
        user: {
          id: String(n.actor_id),
          username: n.actor_username,
          fullName: n.actor_full_name,
          avatar: resolveUrl(n.actor_avatar) || '',
          avatar_url: resolveUrl(n.actor_avatar) || '',
        },
        post: n.post_id ? {
          id: String(n.post_id_val),
          image: resolveUrl(n.post_image) || '',
        } : null,
      }))
    });
  } catch (err) {
    console.error('[Notifications] Error:', err.message);
    res.json({ notifications: [] });
  }
});

// PUT /api/notifications/read
router.put('/read', authenticate, async (req, res) => {
  await pool.query('UPDATE notifications SET is_read = 1 WHERE recipient_id = $1', [req.user.id]);
  res.json({ success: true });
});

// GET /api/notifications/unread-count
router.get('/unread-count', authenticate, async (req, res) => {
  const result = await pool.query('SELECT COUNT(*) as c FROM notifications WHERE recipient_id = $1 AND is_read = 0', [req.user.id]);
  res.json({ count: parseInt(result.rows[0].c, 10) });
});

module.exports = router;
