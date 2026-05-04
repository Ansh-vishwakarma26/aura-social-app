const router = require('express').Router();
const { pool, formatPost, formatUser, POST_QUERY } = require('../database');
const { authenticate, optionalAuth } = require('../middleware/auth');

// GET /api/explore/trending — top posts by likes
router.get('/trending', optionalAuth, async (req, res) => {
  const uid = req.user?.id || 0;
  const result = await pool.query(`
    ${POST_QUERY}
    GROUP BY p.id, u.id
    ORDER BY likes_count DESC, p.created_at DESC
    LIMIT 12
  `, [uid]);
  
  const posts = await Promise.all(result.rows.map(r => formatPost(r, uid)));
  res.json({ posts });
});

// GET /api/explore/suggested — users not yet followed by current user
router.get('/suggested', optionalAuth, async (req, res) => {
  const uid = req.user?.id || 0;
  const result = await pool.query(`
    SELECT * FROM users
    WHERE id != $1
      AND id NOT IN (SELECT following_id FROM follows WHERE follower_id = $1)
    ORDER BY RANDOM()
    LIMIT 10
  `, [uid]);
  
  const users = await Promise.all(result.rows.map(u => formatUser(u, req.user?.id)));
  res.json({ users });
});

// GET /api/bookmarks — saved posts for current user
router.get('/bookmarks', authenticate, async (req, res) => {
  const uid = req.user.id;
  const result = await pool.query(`
    ${POST_QUERY}
    JOIN bookmarks bk ON bk.post_id = p.id AND bk.user_id = $1
    GROUP BY p.id, u.id
    ORDER BY bk.created_at DESC
  `, [uid]);
  
  const posts = await Promise.all(result.rows.map(r => formatPost(r, uid)));
  res.json({ posts });
});

module.exports = router;
