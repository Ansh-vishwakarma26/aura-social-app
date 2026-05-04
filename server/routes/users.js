const router = require('express').Router();
const path = require('path');
const multer = require('multer');
const { pool, formatUser, sendNotification } = require('../database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const cloudinary = require('../cloudinary');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const uploadToCloudinary = (file, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    stream.end(file.buffer);
  });
};

// GET /api/users/search?q=
router.get('/search', optionalAuth, async (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const uid = req.user ? req.user.id : 0;
  const result = await pool.query(`
    SELECT * FROM users 
    WHERE (username ILIKE $1 OR full_name ILIKE $1) 
    AND id != $2 
    AND id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = $2)
    AND id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = $2)
    LIMIT 20
  `, [q, uid]);
  
  const users = await Promise.all(result.rows.map(u => formatUser(u, req.user?.id)));
  res.json({ users });
});

// GET /api/users/:username
router.get('/:username', optionalAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [req.params.username]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (req.user) {
    const isBlocked = await pool.query('SELECT 1 FROM blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)', [req.user.id, user.id]);
    if (isBlocked.rowCount > 0) return res.json({ isBlocked: true });
  }

  res.json({ user: await formatUser(user, req.user?.id) });
});

// PUT /api/users/me  — update profile
router.put('/me', authenticate, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), async (req, res) => {
  const { fullName, username, bio, mbti, coverImage } = req.body;
  
  const avatarFile = req.files?.['avatar']?.[0];
  const coverFile = req.files?.['cover']?.[0];

  let avatarUrl = undefined;
  let coverUrl = coverImage;

  if (avatarFile) {
    try {
      avatarUrl = await uploadToCloudinary(avatarFile, 'aura_avatars');
    } catch (err) {
      console.error('Cloudinary avatar upload error:', err);
    }
  }

  if (coverFile) {
    try {
      coverUrl = await uploadToCloudinary(coverFile, 'aura_covers');
    } catch (err) {
      console.error('Cloudinary cover upload error:', err);
    }
  }

  const current = req.user;

  // If username is changing, check for uniqueness
  if (username && username !== current.username) {
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ message: 'Username already taken' });
    }
  }

  await pool.query(`
    UPDATE users SET
      full_name = $1,
      username = $2,
      bio = $3,
      mbti = $4,
      cover_image_url = $5,
      avatar_url = COALESCE($6, avatar_url),
      is_private = $7,
      push_enabled = $8,
      email_enabled = $9,
      quiet_mode = $10,
      activity_status_enabled = $11
    WHERE id = $12
  `, [
    fullName || current.full_name,
    username || current.username,
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
  ]);

  const updatedRes = await pool.query('SELECT * FROM users WHERE id = $1', [current.id]);
  res.json({ user: await formatUser(updatedRes.rows[0], current.id) });
});

// PUT /api/users/password
router.put('/password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Both current and new password are required' });
  
  const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const user = result.rows[0];
  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) return res.status(400).json({ message: 'Incorrect current password' });
  
  const hashed = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, req.user.id]);
  res.json({ success: true });
});

// GET /api/users/:username/followers
router.get('/:username/followers', optionalAuth, async (req, res) => {
  const userRes = await pool.query('SELECT id FROM users WHERE username = $1', [req.params.username]);
  const user = userRes.rows[0];
  if (!user) return res.status(404).json({ message: 'User not found' });
  
  const result = await pool.query(`
    SELECT u.* FROM users u
    JOIN follows f ON f.follower_id = u.id
    WHERE f.following_id = $1
    ORDER BY f.created_at DESC
  `, [user.id]);
  
  const users = await Promise.all(result.rows.map(u => formatUser(u, req.user?.id)));
  res.json({ users });
});

// GET /api/users/:username/following
router.get('/:username/following', optionalAuth, async (req, res) => {
  const userRes = await pool.query('SELECT id FROM users WHERE username = $1', [req.params.username]);
  const user = userRes.rows[0];
  if (!user) return res.status(404).json({ message: 'User not found' });
  
  const result = await pool.query(`
    SELECT u.* FROM users u
    JOIN follows f ON f.following_id = u.id
    WHERE f.follower_id = $1
    ORDER BY f.created_at DESC
  `, [user.id]);
  
  const users = await Promise.all(result.rows.map(u => formatUser(u, req.user?.id)));
  res.json({ users });
});

// POST /api/users/:username/follow
router.post('/:username/follow', authenticate, async (req, res) => {
  const targetRes = await pool.query('SELECT * FROM users WHERE username = $1', [req.params.username]);
  const target = targetRes.rows[0];
  if (!target) return res.status(404).json({ message: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ message: 'Cannot follow yourself' });

  // Check if already following
  const isFollowing = await pool.query('SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2', [req.user.id, target.id]);
  if (isFollowing.rowCount > 0) return res.json({ success: true, isFollowing: true });

  if (target.is_private) {
    // Check if request already exists
    const existingReq = await pool.query('SELECT 1 FROM follow_requests WHERE requester_id = $1 AND target_id = $2', [req.user.id, target.id]);
    if (existingReq.rowCount > 0) return res.json({ success: true, isRequested: true });

    await pool.query('INSERT INTO follow_requests (requester_id, target_id) VALUES ($1, $2)', [req.user.id, target.id]);
    
    // Create follow request notification
    await sendNotification(target.id, req.user.id, 'follow_request');
    
    return res.json({ success: true, isRequested: true });
  }

  try {
    await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, target.id]);
    // Create follow notification
    await sendNotification(target.id, req.user.id, 'follow');
    res.json({ success: true, isFollowing: true });
  } catch (err) {
    res.json({ success: true, isFollowing: true });
  }
});

// DELETE /api/users/:username/follow
router.delete('/:username/follow', authenticate, async (req, res) => {
  const targetRes = await pool.query('SELECT * FROM users WHERE username = $1', [req.params.username]);
  const target = targetRes.rows[0];
  if (!target) return res.status(404).json({ message: 'User not found' });
  
  await pool.query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [req.user.id, target.id]);
  await pool.query('DELETE FROM follow_requests WHERE requester_id = $1 AND target_id = $2', [req.user.id, target.id]);
  
  res.json({ success: true, isFollowing: false, isRequested: false });
});

// GET /api/users/me/requests
router.get('/me/requests', authenticate, async (req, res) => {
  const result = await pool.query(`
    SELECT fr.id as requestId, u.* FROM follow_requests fr
    JOIN users u ON fr.requester_id = u.id
    WHERE fr.target_id = $1
    ORDER BY fr.created_at DESC
  `, [req.user.id]);
  
  const requests = await Promise.all(result.rows.map(async r => {
    const u = await formatUser(r, req.user.id);
    return { ...u, requestId: r.requestid }; // Postgres lowercases unquoted aliases
  }));
  res.json({ requests });
});

// POST /api/users/requests/:id/accept
router.post('/requests/:id/accept', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const requestRes = await client.query('SELECT * FROM follow_requests WHERE id = $1 AND target_id = $2', [req.params.id, req.user.id]);
    const request = requestRes.rows[0];
    if (!request) return res.status(404).json({ message: 'Request not found' });

    await client.query('BEGIN');
    await client.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [request.requester_id, req.user.id]);
    await client.query('DELETE FROM follow_requests WHERE id = $1', [request.id]);
    // Update notification from follow_request to follow
    await client.query(`
      UPDATE notifications SET type = 'follow' 
      WHERE recipient_id = $1 AND actor_id = $2 AND type = 'follow_request'
    `, [req.user.id, request.requester_id]);
    await client.query('COMMIT');

    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// POST /api/users/requests/:id/decline
router.post('/requests/:id/decline', authenticate, async (req, res) => {
  const requestRes = await pool.query('SELECT * FROM follow_requests WHERE id = $1 AND target_id = $2', [req.params.id, req.user.id]);
  const request = requestRes.rows[0];
  if (!request) return res.status(404).json({ message: 'Request not found' });

  await pool.query('DELETE FROM follow_requests WHERE id = $1', [request.id]);
  // Delete the notification
  await pool.query(`
    DELETE FROM notifications WHERE recipient_id = $1 AND actor_id = $2 AND type = 'follow_request'
  `, [req.user.id, request.requester_id]);

  res.json({ success: true });
});

// ─── Block & Mute Endpoints ──────────────────────────────────────────────────

// GET /api/users/me/blocks
router.get('/me/blocks', authenticate, async (req, res) => {
  const result = await pool.query(`
    SELECT u.* FROM blocks b
    JOIN users u ON b.blocked_id = u.id
    WHERE b.blocker_id = $1
    ORDER BY b.created_at DESC
  `, [req.user.id]);
  
  const users = await Promise.all(result.rows.map(u => formatUser(u, req.user.id)));
  res.json({ users });
});

// POST /api/users/:username/block
router.post('/:username/block', authenticate, async (req, res) => {
  const targetRes = await pool.query('SELECT id FROM users WHERE username = $1', [req.params.username]);
  const target = targetRes.rows[0];
  if (!target) return res.status(404).json({ message: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ message: 'Cannot block yourself' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, target.id]);
    // Unfollow each other
    await client.query('DELETE FROM follows WHERE (follower_id = $1 AND following_id = $2) OR (follower_id = $2 AND following_id = $1)', [req.user.id, target.id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/users/:username/block
router.delete('/:username/block', authenticate, async (req, res) => {
  const targetRes = await pool.query('SELECT id FROM users WHERE username = $1', [req.params.username]);
  const target = targetRes.rows[0];
  if (target) {
    await pool.query('DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2', [req.user.id, target.id]);
  }
  res.json({ success: true });
});

// GET /api/users/me/mutes
router.get('/me/mutes', authenticate, async (req, res) => {
  const result = await pool.query(`
    SELECT u.* FROM mutes m
    JOIN users u ON m.muted_id = u.id
    WHERE m.muter_id = $1
    ORDER BY m.created_at DESC
  `, [req.user.id]);
  
  const users = await Promise.all(result.rows.map(u => formatUser(u, req.user.id)));
  res.json({ users });
});

// POST /api/users/:username/mute
router.post('/:username/mute', authenticate, async (req, res) => {
  const targetRes = await pool.query('SELECT id FROM users WHERE username = $1', [req.params.username]);
  const target = targetRes.rows[0];
  if (!target) return res.status(404).json({ message: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ message: 'Cannot mute yourself' });

  await pool.query('INSERT INTO mutes (muter_id, muted_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, target.id]);
  res.json({ success: true });
});

// DELETE /api/users/:username/mute
router.delete('/:username/mute', authenticate, async (req, res) => {
  const targetRes = await pool.query('SELECT id FROM users WHERE username = $1', [req.params.username]);
  const target = targetRes.rows[0];
  if (target) {
    await pool.query('DELETE FROM mutes WHERE muter_id = $1 AND muted_id = $2', [req.user.id, target.id]);
  }
  res.json({ success: true });
});

// ─── Close Friends Endpoints ─────────────────────────────────────────────────

// GET /api/users/me/close-friends
router.get('/me/close-friends', authenticate, async (req, res) => {
  const result = await pool.query(`
    SELECT u.* FROM close_friends c
    JOIN users u ON c.friend_id = u.id
    WHERE c.user_id = $1
    ORDER BY c.created_at DESC
  `, [req.user.id]);
  
  const users = await Promise.all(result.rows.map(u => formatUser(u, req.user.id)));
  res.json({ users });
});

// POST /api/users/:username/close-friend
router.post('/:username/close-friend', authenticate, async (req, res) => {
  const targetRes = await pool.query('SELECT id FROM users WHERE username = $1', [req.params.username]);
  const target = targetRes.rows[0];
  if (!target) return res.status(404).json({ message: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ message: 'Cannot add yourself to close friends' });

  await pool.query('INSERT INTO close_friends (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, target.id]);
  res.json({ success: true });
});

// DELETE /api/users/:username/close-friend
router.delete('/:username/close-friend', authenticate, async (req, res) => {
  const targetRes = await pool.query('SELECT id FROM users WHERE username = $1', [req.params.username]);
  const target = targetRes.rows[0];
  if (target) {
    await pool.query('DELETE FROM close_friends WHERE user_id = $1 AND friend_id = $2', [req.user.id, target.id]);
  }
  res.json({ success: true });
});

module.exports = router;
