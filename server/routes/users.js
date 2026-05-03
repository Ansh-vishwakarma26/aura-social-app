const router = require('express').Router();
const path = require('path');
const multer = require('multer');
const { db, formatUser, sendNotification } = require('../database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../server/uploads'),
  filename: (req, file, cb) => cb(null, `avatar-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/users/search?q=
router.get('/search', optionalAuth, (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const uid = req.user ? req.user.id : 0;
  const users = db.prepare(`
    SELECT * FROM users 
    WHERE (username LIKE ? OR full_name LIKE ?) 
    AND id != ? 
    AND id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
    AND id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
    LIMIT 20
  `).all(q, q, uid, uid, uid);
  res.json({ users: users.map(u => formatUser(u, req.user?.id)) });
});

// GET /api/users/:username
router.get('/:username', optionalAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (req.user) {
    const isBlocked = db.prepare('SELECT 1 FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)').get(req.user.id, user.id, user.id, req.user.id);
    if (isBlocked) return res.json({ isBlocked: true });
  }

  res.json({ user: formatUser(user, req.user?.id) });
});

// PUT /api/users/me  — update profile
router.put('/me', authenticate, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), (req, res) => {
  const { fullName, bio, mbti, coverImage } = req.body;
  
  const avatarFile = req.files?.['avatar']?.[0];
  const coverFile = req.files?.['cover']?.[0];

  const avatarUrl = avatarFile ? `/uploads/${avatarFile.filename}` : undefined;
  const coverUrl = coverFile ? `/uploads/${coverFile.filename}` : coverImage;

  const current = req.user;
  db.prepare(`
    UPDATE users SET
      full_name = ?,
      bio = ?,
      mbti = ?,
      cover_image_url = ?,
      avatar_url = COALESCE(?, avatar_url),
      is_private = ?,
      push_enabled = ?,
      email_enabled = ?,
      quiet_mode = ?,
      activity_status_enabled = ?
    WHERE id = ?
  `).run(
    fullName || current.full_name,
    bio !== undefined ? bio : current.bio,
    mbti || current.mbti,
    coverUrl !== undefined ? coverUrl : current.cover_image_url,
    avatarUrl || null,
    req.body.isPrivate !== undefined ? (req.body.isPrivate === 'true' || req.body.isPrivate === true ? 1 : 0) : current.is_private,
    req.body.pushEnabled !== undefined ? (req.body.pushEnabled === 'true' || req.body.pushEnabled === true ? 1 : 0) : current.push_enabled,
    req.body.emailEnabled !== undefined ? (req.body.emailEnabled === 'true' || req.body.emailEnabled === true ? 1 : 0) : current.email_enabled,
    req.body.quietMode !== undefined ? (req.body.quietMode === 'true' || req.body.quietMode === true ? 1 : 0) : current.quiet_mode,
    req.body.activityStatusEnabled !== undefined ? (req.body.activityStatusEnabled === 'true' || req.body.activityStatusEnabled === true ? 1 : 0) : current.activity_status_enabled,
    current.id
  );

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(current.id);
  res.json({ user: formatUser(updated, current.id) });
});

// PUT /api/users/password
router.put('/password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Both current and new password are required' });
  
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) return res.status(400).json({ message: 'Incorrect current password' });
  
  const hashed = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashed, req.user.id);
  res.json({ success: true });
});

// GET /api/users/:username/followers
router.get('/:username/followers', optionalAuth, (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const followers = db.prepare(`
    SELECT u.* FROM users u
    JOIN follows f ON f.follower_id = u.id
    WHERE f.following_id = ?
    ORDER BY f.created_at DESC
  `).all(user.id);
  res.json({ users: followers.map(u => formatUser(u, req.user?.id)) });
});

// GET /api/users/:username/following
router.get('/:username/following', optionalAuth, (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const following = db.prepare(`
    SELECT u.* FROM users u
    JOIN follows f ON f.following_id = u.id
    WHERE f.follower_id = ?
    ORDER BY f.created_at DESC
  `).all(user.id);
  res.json({ users: following.map(u => formatUser(u, req.user?.id)) });
});

// POST /api/users/:username/follow
router.post('/:username/follow', authenticate, (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ message: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ message: 'Cannot follow yourself' });

  // Check if already following
  const isFollowing = db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(req.user.id, target.id);
  if (isFollowing) return res.json({ success: true, isFollowing: true });

  if (target.is_private) {
    // Check if request already exists
    const existingReq = db.prepare('SELECT 1 FROM follow_requests WHERE requester_id = ? AND target_id = ?').get(req.user.id, target.id);
    if (existingReq) return res.json({ success: true, isRequested: true });

    db.prepare('INSERT INTO follow_requests (requester_id, target_id) VALUES (?, ?)').run(req.user.id, target.id);
    
    // Create follow request notification
    sendNotification(target.id, req.user.id, 'follow_request');
    
    return res.json({ success: true, isRequested: true });
  }

  try {
    db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(req.user.id, target.id);
    // Create follow notification
    sendNotification(target.id, req.user.id, 'follow');
    res.json({ success: true, isFollowing: true });
  } catch {
    res.json({ success: true, isFollowing: true });
  }
});

// DELETE /api/users/:username/follow
router.delete('/:username/follow', authenticate, (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ message: 'User not found' });
  
  db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(req.user.id, target.id);
  db.prepare('DELETE FROM follow_requests WHERE requester_id = ? AND target_id = ?').run(req.user.id, target.id);
  
  res.json({ success: true, isFollowing: false, isRequested: false });
});

// GET /api/users/me/requests
router.get('/me/requests', authenticate, (req, res) => {
  const requests = db.prepare(`
    SELECT fr.id as requestId, u.* FROM follow_requests fr
    JOIN users u ON fr.requester_id = u.id
    WHERE fr.target_id = ?
    ORDER BY fr.created_at DESC
  `).all(req.user.id);
  res.json({ requests: requests.map(r => ({ ...formatUser(r, req.user.id), requestId: r.requestId })) });
});

// POST /api/users/requests/:id/accept
router.post('/requests/:id/accept', authenticate, (req, res) => {
  const request = db.prepare('SELECT * FROM follow_requests WHERE id = ? AND target_id = ?').get(req.params.id, req.user.id);
  if (!request) return res.status(404).json({ message: 'Request not found' });

  db.transaction(() => {
    db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)').run(request.requester_id, req.user.id);
    db.prepare('DELETE FROM follow_requests WHERE id = ?').run(request.id);
    // Update notification from follow_request to follow
    db.prepare(`
      UPDATE notifications SET type = 'follow' 
      WHERE recipient_id = ? AND actor_id = ? AND type = 'follow_request'
    `).run(req.user.id, request.requester_id);
  })();

  res.json({ success: true });
});

// POST /api/users/requests/:id/decline
router.post('/requests/:id/decline', authenticate, (req, res) => {
  const request = db.prepare('SELECT * FROM follow_requests WHERE id = ? AND target_id = ?').get(req.params.id, req.user.id);
  if (!request) return res.status(404).json({ message: 'Request not found' });

  db.prepare('DELETE FROM follow_requests WHERE id = ?').run(request.id);
  // Delete the notification
  db.prepare(`
    DELETE FROM notifications WHERE recipient_id = ? AND actor_id = ? AND type = 'follow_request'
  `).run(req.user.id, request.requester_id);

  res.json({ success: true });
});

// ─── Block & Mute Endpoints ──────────────────────────────────────────────────

// GET /api/users/me/blocks
router.get('/me/blocks', authenticate, (req, res) => {
  const blocks = db.prepare(`
    SELECT u.* FROM blocks b
    JOIN users u ON b.blocked_id = u.id
    WHERE b.blocker_id = ?
    ORDER BY b.created_at DESC
  `).all(req.user.id);
  res.json({ users: blocks.map(u => formatUser(u, req.user.id)) });
});

// POST /api/users/:username/block
router.post('/:username/block', authenticate, (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ message: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ message: 'Cannot block yourself' });

  db.transaction(() => {
    db.prepare('INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)').run(req.user.id, target.id);
    // Unfollow each other
    db.prepare('DELETE FROM follows WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)').run(req.user.id, target.id, target.id, req.user.id);
  })();
  res.json({ success: true });
});

// DELETE /api/users/:username/block
router.delete('/:username/block', authenticate, (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (target) {
    db.prepare('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?').run(req.user.id, target.id);
  }
  res.json({ success: true });
});

// GET /api/users/me/mutes
router.get('/me/mutes', authenticate, (req, res) => {
  const mutes = db.prepare(`
    SELECT u.* FROM mutes m
    JOIN users u ON m.muted_id = u.id
    WHERE m.muter_id = ?
    ORDER BY m.created_at DESC
  `).all(req.user.id);
  res.json({ users: mutes.map(u => formatUser(u, req.user.id)) });
});

// POST /api/users/:username/mute
router.post('/:username/mute', authenticate, (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ message: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ message: 'Cannot mute yourself' });

  db.prepare('INSERT OR IGNORE INTO mutes (muter_id, muted_id) VALUES (?, ?)').run(req.user.id, target.id);
  res.json({ success: true });
});

// DELETE /api/users/:username/mute
router.delete('/:username/mute', authenticate, (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (target) {
    db.prepare('DELETE FROM mutes WHERE muter_id = ? AND muted_id = ?').run(req.user.id, target.id);
  }
  res.json({ success: true });
});

// ─── Close Friends Endpoints ─────────────────────────────────────────────────

// GET /api/users/me/close-friends
router.get('/me/close-friends', authenticate, (req, res) => {
  const friends = db.prepare(`
    SELECT u.* FROM close_friends c
    JOIN users u ON c.friend_id = u.id
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `).all(req.user.id);
  res.json({ users: friends.map(u => formatUser(u, req.user.id)) });
});

// POST /api/users/:username/close-friend
router.post('/:username/close-friend', authenticate, (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ message: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ message: 'Cannot add yourself to close friends' });

  db.prepare('INSERT OR IGNORE INTO close_friends (user_id, friend_id) VALUES (?, ?)').run(req.user.id, target.id);
  res.json({ success: true });
});

// DELETE /api/users/:username/close-friend
router.delete('/:username/close-friend', authenticate, (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (target) {
    db.prepare('DELETE FROM close_friends WHERE user_id = ? AND friend_id = ?').run(req.user.id, target.id);
  }
  res.json({ success: true });
});

module.exports = router;
