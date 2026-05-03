const router = require('express').Router();
const path = require('path');
const multer = require('multer');
const { db, formatPost, formatUser, POST_QUERY, timeAgo, sendNotification } = require('../database');
const { authenticate, optionalAuth } = require('../middleware/auth');

// ─── Multer for post images ──────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../server/uploads'),
  filename: (req, file, cb) => cb(null, `post-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── GET /api/posts/feed ─────────────────────────────────────────────────────
router.get('/feed', authenticate, (req, res) => {
  const uid = req.user.id;
  const offset = parseInt(req.query.offset) || 0;
  const rows = db.prepare(`
    ${POST_QUERY}
    WHERE p.user_id IN (
      SELECT following_id FROM follows WHERE follower_id = @uid
      UNION SELECT @uid
    )
    AND p.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = @uid)
    AND p.user_id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = @uid)
    AND p.user_id NOT IN (SELECT muted_id FROM mutes WHERE muter_id = @uid)
    AND (p.is_close_friends = 0 OR p.user_id = @uid OR p.user_id IN (SELECT user_id FROM close_friends WHERE friend_id = @uid))
    GROUP BY p.id ORDER BY p.created_at DESC LIMIT 20 OFFSET @offset
  `).all({ uid, offset });
  res.json({ posts: rows.map(r => formatPost(r, uid)) });
});

// ─── GET /api/posts/user/:username ───────────────────────────────────────────
router.get('/user/:username', optionalAuth, (req, res) => {
  const user = db.prepare('SELECT id, is_private FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ message: 'User not found' });
  
  const uid = req.user?.id || 0;
  const isOwner = uid === user.id;
  const isFollowing = uid ? !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(uid, user.id) : false;

  if (user.is_private && !isOwner && !isFollowing) {
    return res.json({ posts: [], isPrivate: true });
  }

  const rows = db.prepare(`
    ${POST_QUERY}
    WHERE p.user_id = @postUserId
    AND (p.is_close_friends = 0 OR p.user_id = @uid OR p.user_id IN (SELECT user_id FROM close_friends WHERE friend_id = @uid))
    GROUP BY p.id ORDER BY p.created_at DESC
  `).all({ uid, postUserId: user.id });
  res.json({ posts: rows.map(r => formatPost(r, uid)) });
});

// ─── GET /api/posts/:id ──────────────────────────────────────────────────────
router.get('/:id', optionalAuth, (req, res) => {
  const uid = req.user?.id || 0;
  const row = db.prepare(`
    ${POST_QUERY}
    WHERE p.id = @postId
    GROUP BY p.id
  `).get({ uid, postId: req.params.id });
  if (!row) return res.status(404).json({ message: 'Post not found' });

  // Check privacy
  const postUser = db.prepare('SELECT is_private FROM users WHERE id = ?').get(row.user_id);
  const isOwner = uid === row.user_id;
  const isFollowing = uid ? !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(uid, row.user_id) : false;

  if (postUser.is_private && !isOwner && !isFollowing) {
    return res.status(403).json({ message: 'This account is private' });
  }

  if (row.is_close_friends && !isOwner) {
    const isCloseFriend = db.prepare('SELECT 1 FROM close_friends WHERE user_id = ? AND friend_id = ?').get(row.user_id, uid);
    if (!isCloseFriend) return res.status(403).json({ message: 'This post is for close friends only' });
  }

  const post = formatPost(row, uid);

  // Include full comments
  const comments = db.prepare(`
    SELECT c.*, u.username, u.full_name, u.avatar_url FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ? ORDER BY c.created_at ASC
  `).all(row.id);
  post.comments = comments.map(c => ({
    id: String(c.id),
    user: { id: String(c.user_id), username: c.username, fullName: c.full_name, avatar: c.avatar_url },
    text: c.text,
    timestamp: timeAgo(c.created_at),
  }));
  post.commentsCount = comments.length;

  res.json({ post });
});

// ─── POST /api/posts ─────────────────────────────────────────────────────────
router.post('/', authenticate, upload.single('image'), (req, res) => {
  const { caption, isCloseFriends } = req.body;
  if (!caption) return res.status(400).json({ message: 'Caption is required' });
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.imageUrl || '');
  const closeFriendsFlag = isCloseFriends === 'true' || isCloseFriends === true ? 1 : 0;
  
  const result = db.prepare('INSERT INTO posts (user_id, caption, image_url, is_close_friends) VALUES (?, ?, ?, ?)').run(req.user.id, caption, imageUrl, closeFriendsFlag);
  const uid = req.user.id;
  const row = db.prepare(`${POST_QUERY} WHERE p.id = @postId GROUP BY p.id`).get({ uid, postId: result.lastInsertRowid });
  res.status(201).json({ post: formatPost(row, uid) });
});

// ─── DELETE /api/posts/:id ───────────────────────────────────────────────────
router.delete('/:id', authenticate, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  if (post.user_id !== req.user.id) return res.status(403).json({ message: 'Not your post' });
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── POST /api/posts/:id/like ────────────────────────────────────────────────
router.post('/:id/like', authenticate, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  try {
    db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)').run(req.user.id, post.id);
    if (post.user_id !== req.user.id) {
      sendNotification(post.user_id, req.user.id, 'like', post.id);
    }
  } catch { /* already liked */ }
  const count = db.prepare('SELECT COUNT(*) as c FROM likes WHERE post_id = ?').get(post.id).c;
  res.json({ success: true, likes: count, isLiked: true });
});

// ─── DELETE /api/posts/:id/like ──────────────────────────────────────────────
router.delete('/:id/like', authenticate, (req, res) => {
  db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').run(req.user.id, req.params.id);
  const count = db.prepare('SELECT COUNT(*) as c FROM likes WHERE post_id = ?').get(req.params.id).c;
  res.json({ success: true, likes: count, isLiked: false });
});

// ─── GET /api/posts/:id/comments ─────────────────────────────────────────────
router.get('/:id/comments', optionalAuth, (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.username, u.full_name, u.avatar_url FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ? ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json({
    comments: comments.map(c => ({
      id: String(c.id),
      user: { id: String(c.user_id), username: c.username, fullName: c.full_name, avatar: c.avatar_url },
      text: c.text,
      timestamp: timeAgo(c.created_at),
    }))
  });
});

// ─── POST /api/posts/:id/comments ────────────────────────────────────────────
router.post('/:id/comments', authenticate, (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ message: 'Comment text required' });
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  const result = db.prepare('INSERT INTO comments (user_id, post_id, text) VALUES (?, ?, ?)').run(req.user.id, post.id, text.trim());
  if (post.user_id !== req.user.id) {
    sendNotification(post.user_id, req.user.id, 'comment', post.id, text.trim());
  }
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
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
router.post('/:id/bookmark', authenticate, (req, res) => {
  try {
    db.prepare('INSERT INTO bookmarks (user_id, post_id) VALUES (?, ?)').run(req.user.id, req.params.id);
  } catch { /* already saved */ }
  res.json({ success: true, isSaved: true });
});

// ─── DELETE /api/posts/:id/bookmark ──────────────────────────────────────────
router.delete('/:id/bookmark', authenticate, (req, res) => {
  db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?').run(req.user.id, req.params.id);
  res.json({ success: true, isSaved: false });
});

module.exports = router;
