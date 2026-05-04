const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const UPLOADS_PATH = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_PATH)) {
  fs.mkdirSync(UPLOADS_PATH, { recursive: true });
}

// ─── PostgreSQL Connection ───────────────────────────────────────────────────
// Setup connection pool. Configure DATABASE_URL in your .env file.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aura',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

console.log('📡 Database connection string:', (process.env.DATABASE_URL || 'FALLBACK').replace(/:[^@]+@/, ':****@'));

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

async function initDB() {
  const client = await pool.connect();
  try {
    console.log('✅ Connected to PostgreSQL');
    
    // Create all tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        bio TEXT DEFAULT '',
        avatar_url TEXT DEFAULT '',
        cover_image_url TEXT DEFAULT '',
        mbti VARCHAR(50) DEFAULT 'INFP',
        is_private INT DEFAULT 0,
        push_enabled INT DEFAULT 1,
        email_enabled INT DEFAULT 1,
        quiet_mode INT DEFAULT 0,
        activity_status_enabled INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        caption TEXT NOT NULL,
        image_url TEXT DEFAULT '',
        is_close_friends INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
      );

      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bookmarks (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
      );

      CREATE TABLE IF NOT EXISTS follows (
        id SERIAL PRIMARY KEY,
        follower_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        recipient_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        actor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK(type IN ('like', 'comment', 'follow', 'follow_request')),
        post_id INT REFERENCES posts(id) ON DELETE CASCADE,
        text TEXT DEFAULT '',
        is_read INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS follow_requests (
        id SERIAL PRIMARY KEY,
        requester_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(requester_id, target_id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        is_read INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS blocks (
        id SERIAL PRIMARY KEY,
        blocker_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(blocker_id, blocked_id)
      );

      CREATE TABLE IF NOT EXISTS mutes (
        id SERIAL PRIMARY KEY,
        muter_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        muted_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(muter_id, muted_id)
      );

      CREATE TABLE IF NOT EXISTS close_friends (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        friend_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, friend_id)
      );
    `);
    console.log('✅ PostgreSQL schema initialized');
  } catch (err) {
    console.error('⚠️ Database initialization failed:', err.message);
  } finally {
    client.release();
  }
}

// Removed auto-init to prevent race conditions with migrations
// initDB();

// ─── Helper: time ago ────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return 'just now';
  const dStr = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
  const formattedDate = dStr.includes('Z') ? dStr : dStr.replace(' ', 'T') + 'Z';
  const date = new Date(formattedDate);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

// ─── Helper: format user row ─────────────────────────────────────────────────
async function formatUser(user, currentUserId = null) {
  const followersCount = (await pool.query('SELECT COUNT(*) as c FROM follows WHERE following_id = $1', [user.id])).rows[0].c;
  const followingCount = (await pool.query('SELECT COUNT(*) as c FROM follows WHERE follower_id = $1', [user.id])).rows[0].c;
  
  let isFollowing = false;
  let isRequested = false;
  let isCloseFriend = false;
  
  if (currentUserId) {
    isFollowing = (await pool.query('SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2', [currentUserId, user.id])).rowCount > 0;
    isRequested = (await pool.query('SELECT 1 FROM follow_requests WHERE requester_id = $1 AND target_id = $2', [currentUserId, user.id])).rowCount > 0;
    isCloseFriend = (await pool.query('SELECT 1 FROM close_friends WHERE user_id = $1 AND friend_id = $2', [currentUserId, user.id])).rowCount > 0;
  }

  return {
    id: String(user.id),
    username: user.username,
    fullName: user.full_name,
    email: user.email,
    bio: user.bio || '',
    avatar: user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=18181b&color=ffffff`,
    coverImage: user.cover_image_url || '',
    mbti: user.mbti || 'INFP',
    isPrivate: !!user.is_private,
    pushEnabled: user.push_enabled === 1,
    emailEnabled: user.email_enabled === 1,
    quietMode: user.quiet_mode === 1,
    activityStatusEnabled: user.activity_status_enabled === 1,
    isRequested,
    followers: parseInt(followersCount, 10),
    following: parseInt(followingCount, 10),
    isFollowing,
    isCloseFriend,
    createdAt: user.created_at,
  };
}

// ─── Helper: format post row ─────────────────────────────────────────────────
const POST_QUERY = `
  SELECT
    p.id, p.user_id, p.caption, p.image_url, p.created_at, p.is_close_friends,
    u.username, u.full_name, u.avatar_url, u.bio, u.mbti,
    COUNT(DISTINCT l.id) AS likes_count,
    COUNT(DISTINCT c.id) AS comments_count,
    MAX(CASE WHEN ul.user_id = $1 THEN 1 ELSE 0 END) AS is_liked,
    MAX(CASE WHEN b.user_id = $1 THEN 1 ELSE 0 END) AS is_saved
  FROM posts p
  JOIN users u ON p.user_id = u.id
  LEFT JOIN likes l ON l.post_id = p.id
  LEFT JOIN comments c ON c.post_id = p.id
  LEFT JOIN likes ul ON ul.post_id = p.id AND ul.user_id = $1
  LEFT JOIN bookmarks b ON b.post_id = p.id AND b.user_id = $1
`;

async function formatPost(row, currentUserId = null) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    user: {
      id: String(row.user_id),
      username: row.username,
      fullName: row.full_name,
      avatar: row.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.full_name)}&background=18181b&color=ffffff`,
      mbti: row.mbti || 'INFP',
      bio: row.bio || '',
    },
    image: row.image_url || '',
    caption: row.caption,
    likes: parseInt(row.likes_count, 10) || 0,
    commentsCount: parseInt(row.comments_count, 10) || 0,
    isLiked: !!row.is_liked,
    isSaved: !!row.is_saved,
    isCloseFriends: !!row.is_close_friends,
    timestamp: timeAgo(row.created_at),
    comments: [],
  };
}

// ─── Helper: Send Notification ───────────────────────────────────────────────
async function sendNotification(recipientId, actorId, type, postId = null, text = null) {
  if (recipientId === actorId) return; // Don't notify self

  const recipientRes = await pool.query('SELECT quiet_mode, push_enabled, email_enabled, email, username FROM users WHERE id = $1', [recipientId]);
  const actorRes = await pool.query('SELECT username FROM users WHERE id = $1', [actorId]);
  
  if (recipientRes.rowCount === 0 || actorRes.rowCount === 0) return;

  const recipient = recipientRes.rows[0];
  const actor = actorRes.rows[0];

  // Insert into app notifications (Quiet Mode doesn't stop in-app notifications, just external ones)
  await pool.query(`
    INSERT INTO notifications (recipient_id, actor_id, type, post_id, text)
    VALUES ($1, $2, $3, $4, $5)
  `, [recipientId, actorId, type, postId, text]);

  // External Notifications (Push / Email)
  if (!recipient.quiet_mode) {
    let msg = '';
    if (type === 'like') msg = `@${actor.username} liked your post.`;
    else if (type === 'comment') msg = `@${actor.username} commented: "${text}"`;
    else if (type === 'follow') msg = `@${actor.username} started following you.`;
    else if (type === 'follow_request') msg = `@${actor.username} requested to follow you.`;

    if (recipient.push_enabled) {
      console.log(`[PUSH NOTIFICATION] To @${recipient.username}: ${msg}`);
    }
    if (recipient.email_enabled) {
      console.log(`[EMAIL NOTIFICATION] To ${recipient.email}: ${msg}`);
    }
  }
}

module.exports = { pool, initDB, formatUser, formatPost, POST_QUERY, timeAgo, sendNotification };
