const router = require('express').Router();
const { db, formatPost, formatUser, POST_QUERY } = require('../database');
const { authenticate, optionalAuth } = require('../middleware/auth');

// GET /api/explore/trending — top posts by likes
router.get('/trending', optionalAuth, (req, res) => {
  const uid = req.user?.id || 0;
  const rows = db.prepare(`
    ${POST_QUERY}
    GROUP BY p.id
    ORDER BY likes_count DESC, p.created_at DESC
    LIMIT 12
  `).all({ uid });
  res.json({ posts: rows.map(r => formatPost(r, uid)) });
});

// GET /api/explore/suggested — users not yet followed by current user
router.get('/suggested', optionalAuth, (req, res) => {
  const uid = req.user?.id || 0;
  const users = db.prepare(`
    SELECT * FROM users
    WHERE id != @uid
      AND id NOT IN (SELECT following_id FROM follows WHERE follower_id = @uid)
    ORDER BY RANDOM()
    LIMIT 10
  `).all({ uid });
  res.json({ users: users.map(u => formatUser(u, req.user?.id)) });
});

// GET /api/bookmarks — saved posts for current user
router.get('/bookmarks', authenticate, (req, res) => {
  const uid = req.user.id;
  const rows = db.prepare(`
    ${POST_QUERY}
    JOIN bookmarks bk ON bk.post_id = p.id AND bk.user_id = @uid
    GROUP BY p.id
    ORDER BY bk.created_at DESC
  `).all({ uid });
  res.json({ posts: rows.map(r => formatPost(r, uid)) });
});

module.exports = router;
