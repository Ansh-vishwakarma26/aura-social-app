const router = require('express').Router();
const path = require('path');
const multer = require('multer');
const { pool, formatPost, formatUser, POST_QUERY, timeAgo, sendNotification } = require('../database');
const { authenticate, optionalAuth } = require('../middleware/auth');

// ─── Multer for post images ──────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../server/uploads'),
  filename: (req, file, cb) => cb(null, `post-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── GET /api/posts/feed ─────────────────────────────────────────────────────
router.get('/feed', authenticate, async (req, res) => {
  const uid = req.user.id;
  const offset = parseInt(req.query.offset) || 0;
  const result = await pool.query(`
    ${POST_QUERY}
    WHERE p.user_id IN (
      SELECT following_id FROM follows WHERE follower_id = $1
      UNION SELECT $1
    )
    AND p.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = $1)
    AND p.user_id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = $1)
    AND p.user_id NOT IN (SELECT muted_id FROM mutes WHERE muter_id = $1)
    AND (p.is_close_friends = 0 OR p.user_id = $1 OR p.user_id IN (SELECT user_id FROM close_friends WHERE friend_id = $1))
    GROUP BY p.id, u.id ORDER BY p.created_at DESC LIMIT 20 OFFSET $2
  `, [uid, offset]);
  
  const posts = await Promise.all(result.rows.map(r => formatPost(r, uid)));
  res.json({ posts });
});

// ─── GET /api/posts/user/:username ───────────────────────────────────────────
router.get('/user/:username', optionalAuth, async (req, res) => {
  const userRes = await pool.query('SELECT id, is_private FROM users WHERE username = $1', [req.params.username]);
  const user = userRes.rows[0];
  if (!user) return res.status(404).json({ message: 'User not found' });
  
  const uid = req.user?.id || 0;
  const isOwner = uid === user.id;
  const isFollowing = uid ? (await pool.query('SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2', [uid, user.id])).rowCount > 0 : false;

  if (user.is_private && !isOwner && !isFollowing) {
    return res.json({ posts: [], isPrivate: true });
  }

  const result = await pool.query(`
    ${POST_QUERY}
    WHERE p.user_id = $2
    AND (p.is_close_friends = 0 OR p.user_id = $1 OR p.user_id IN (SELECT user_id FROM close_friends WHERE friend_id = $1))
    GROUP BY p.id, u.id ORDER BY p.created_at DESC
  `, [uid, user.id]);
  
  const posts = await Promise.all(result.rows.map(r => formatPost(r, uid)));
  res.json({ posts });
});

// ─── GET /api/posts/:id ──────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  const uid = req.user?.id || 0;
  const result = await pool.query(`
    ${POST_QUERY}
    WHERE p.id = $2
    GROUP BY p.id, u.id
  `, [uid, req.params.id]);
  const row = result.rows[0];
  if (!row) return res.status(404).json({ message: 'Post not found' });

  // Check privacy
  const userRes = await pool.query('SELECT is_private FROM users WHERE id = $1', [row.user_id]);
  const postUser = userRes.rows[0];
  const isOwner = uid === row.user_id;
  const isFollowing = uid ? (await pool.query('SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2', [uid, row.user_id])).rowCount > 0 : false;

  if (postUser.is_private && !isOwner && !isFollowing) {
    return res.status(403).json({ message: 'This account is private' });
  }

  if (row.is_close_friends && !isOwner) {
    const isCloseFriend = (await pool.query('SELECT 1 FROM close_friends WHERE user_id = $1 AND friend_id = $2', [row.user_id, uid])).rowCount > 0;
    if (!isCloseFriend) return res.status(403).json({ message: 'This post is for close friends only' });
  }

  const post = await formatPost(row, uid);

  // Include full comments
  const commentsRes = await pool.query(`
    SELECT c.*, u.username, u.full_name, u.avatar_url FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = $1 ORDER BY c.created_at ASC
  `, [row.id]);
  
  post.comments = commentsRes.rows.map(c => ({
    id: String(c.id),
    user: { id: String(c.user_id), username: c.username, fullName: c.full_name, avatar: c.avatar_url },
    text: c.text,
    timestamp: timeAgo(c.created_at),
  }));
  post.commentsCount = commentsRes.rowCount;

  res.json({ post });
});

// ─── POST /api/posts ─────────────────────────────────────────────────────────
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  const { caption, isCloseFriends } = req.body;
  if (!caption) return res.status(400).json({ message: 'Caption is required' });
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.imageUrl || '');
  const closeFriendsFlag = isCloseFriends === 'true' || isCloseFriends === true ? 1 : 0;
  
  const insertResult = await pool.query('INSERT INTO posts (user_id, caption, image_url, is_close_friends) VALUES ($1, $2, $3, $4) RETURNING id', [req.user.id, caption, imageUrl, closeFriendsFlag]);
  const postId = insertResult.rows[0].id;
  
  const uid = req.user.id;
  const result = await pool.query(`${POST_QUERY} WHERE p.id = $2 GROUP BY p.id, u.id`, [uid, postId]);
  res.status(201).json({ post: await formatPost(result.rows[0], uid) });
});

// ─── DELETE /api/posts/:id ───────────────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  const result = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
  const post = result.rows[0];
  if (!post) return res.status(404).json({ message: 'Post not found' });
  if (post.user_id !== req.user.id) return res.status(403).json({ message: 'Not your post' });
  
  await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// ─── POST /api/posts/:id/like ────────────────────────────────────────────────
router.post('/:id/like', authenticate, async (req, res) => {
  const result = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
  const post = result.rows[0];
  if (!post) return res.status(404).json({ message: 'Post not found' });
  try {
    await pool.query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, post.id]);
    if (post.user_id !== req.user.id) {
      await sendNotification(post.user_id, req.user.id, 'like', post.id);
    }
  } catch (err) { /* already liked */ }
  
  const countRes = await pool.query('SELECT COUNT(*) as c FROM likes WHERE post_id = $1', [post.id]);
  res.json({ success: true, likes: parseInt(countRes.rows[0].c, 10), isLiked: true });
});

// ─── DELETE /api/posts/:id/like ──────────────────────────────────────────────
router.delete('/:id/like', authenticate, async (req, res) => {
  await pool.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [req.user.id, req.params.id]);
  const countRes = await pool.query('SELECT COUNT(*) as c FROM likes WHERE post_id = $1', [req.params.id]);
  res.json({ success: true, likes: parseInt(countRes.rows[0].c, 10), isLiked: false });
});

// ─── GET /api/posts/:id/comments ─────────────────────────────────────────────
router.get('/:id/comments', optionalAuth, async (req, res) => {
  const result = await pool.query(`
    SELECT c.*, u.username, u.full_name, u.avatar_url FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = $1 ORDER BY c.created_at ASC
  `, [req.params.id]);
  
  res.json({
    comments: result.rows.map(c => ({
      id: String(c.id),
      user: { id: String(c.user_id), username: c.username, fullName: c.full_name, avatar: c.avatar_url },
      text: c.text,
      timestamp: timeAgo(c.created_at),
    }))
  });
});

// ─── POST /api/posts/:id/comments ────────────────────────────────────────────
router.post('/:id/comments', authenticate, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ message: 'Comment text required' });
  
  const postRes = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
  const post = postRes.rows[0];
  if (!post) return res.status(404).json({ message: 'Post not found' });

  const insertRes = await pool.query('INSERT INTO comments (user_id, post_id, text) VALUES ($1, $2, $3) RETURNING *', [req.user.id, post.id, text.trim()]);
  const comment = insertRes.rows[0];
  
  if (post.user_id !== req.user.id) {
    await sendNotification(post.user_id, req.user.id, 'comment', post.id, text.trim());
  }
  
  const u = req.user;
  res.status(201).json({
    comment: {
      id: String(comment.id),
      user: { id: String(u.id), username: u.username, fullName: u.full_name, avatar: u.avatar_url },
      text: comment.text,
      timestamp: 'just now',
    }
  });
});

// ─── POST /api/posts/:id/bookmark ────────────────────────────────────────────
router.post('/:id/bookmark', authenticate, async (req, res) => {
  try {
    await pool.query('INSERT INTO bookmarks (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, req.params.id]);
  } catch (err) { /* already saved */ }
  res.json({ success: true, isSaved: true });
});

// ─── DELETE /api/posts/:id/bookmark ──────────────────────────────────────────
router.delete('/:id/bookmark', authenticate, async (req, res) => {
  await pool.query('DELETE FROM bookmarks WHERE user_id = $1 AND post_id = $2', [req.user.id, req.params.id]);
  res.json({ success: true, isSaved: false });
});

module.exports = router;
