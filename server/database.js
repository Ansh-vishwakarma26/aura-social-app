const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'aura.db');
const UPLOADS_PATH = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_PATH)) {
  fs.mkdirSync(UPLOADS_PATH, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Graceful shutdown: flush WAL → main .db file ────────────────────────────
// Without this, data written since last checkpoint is only in aura.db-wal
// and could appear missing to external tools or after a crash.
function checkpoint() {
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
    console.log('✅ Database checkpoint complete — all data saved to aura.db');
  } catch (e) {
    console.error('⚠️  Checkpoint failed:', e.message);
  }
}

process.on('SIGINT',  () => { checkpoint(); process.exit(0); });
process.on('SIGTERM', () => { checkpoint(); process.exit(0); });
process.on('exit',    () => { try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch {} });

// Create all tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    cover_image_url TEXT DEFAULT '',
    mbti TEXT DEFAULT 'INFP',
    is_private INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    caption TEXT NOT NULL,
    image_url TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
  );

  CREATE TABLE IF NOT EXISTS follows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('like', 'comment', 'follow', 'follow_request')),
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    text TEXT DEFAULT '',
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS follow_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requester_id, target_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blocker_id, blocked_id)
  );

  CREATE TABLE IF NOT EXISTS mutes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    muter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    muted_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(muter_id, muted_id)
  );

  CREATE TABLE IF NOT EXISTS close_friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id)
  );
`);

// ─── Migrations ──────────────────────────────────────────────────────────────
try {
  db.exec('ALTER TABLE posts ADD COLUMN is_close_friends INTEGER DEFAULT 0;');
} catch (e) {
  // column already exists
}

// ─── Helper: time ago ────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const formattedDate = dateStr.includes('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
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
function formatUser(user, currentUserId = null) {
  const followersCount = db.prepare('SELECT COUNT(*) as c FROM follows WHERE following_id = ?').get(user.id).c;
  const followingCount = db.prepare('SELECT COUNT(*) as c FROM follows WHERE follower_id = ?').get(user.id).c;
  const isFollowing = currentUserId
    ? !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(currentUserId, user.id)
    : false;

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
    isRequested: currentUserId 
      ? !!db.prepare('SELECT 1 FROM follow_requests WHERE requester_id = ? AND target_id = ?').get(currentUserId, user.id)
      : false,
    followers: followersCount,
    following: followingCount,
    isFollowing,
    isCloseFriend: currentUserId
      ? !!db.prepare('SELECT 1 FROM close_friends WHERE user_id = ? AND friend_id = ?').get(currentUserId, user.id)
      : false,
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
    MAX(CASE WHEN ul.user_id = @uid THEN 1 ELSE 0 END) AS is_liked,
    MAX(CASE WHEN b.user_id = @uid THEN 1 ELSE 0 END) AS is_saved
  FROM posts p
  JOIN users u ON p.user_id = u.id
  LEFT JOIN likes l ON l.post_id = p.id
  LEFT JOIN comments c ON c.post_id = p.id
  LEFT JOIN likes ul ON ul.post_id = p.id AND ul.user_id = @uid
  LEFT JOIN bookmarks b ON b.post_id = p.id AND b.user_id = @uid
`;

function formatPost(row, currentUserId = null) {
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
    likes: row.likes_count || 0,
    commentsCount: row.comments_count || 0,
    isLiked: !!row.is_liked,
    isSaved: !!row.is_saved,
    isCloseFriends: !!row.is_close_friends,
    timestamp: timeAgo(row.created_at),
    comments: [],
  };
}

// ─── Helper: Send Notification ───────────────────────────────────────────────
function sendNotification(recipientId, actorId, type, postId = null, text = null) {
  if (recipientId === actorId) return; // Don't notify self

  const recipient = db.prepare('SELECT quiet_mode, push_enabled, email_enabled, email, username FROM users WHERE id = ?').get(recipientId);
  const actor = db.prepare('SELECT username FROM users WHERE id = ?').get(actorId);
  
  if (!recipient) return;

  // Insert into app notifications (Quiet Mode doesn't stop in-app notifications, just external ones)
  db.prepare(`
    INSERT INTO notifications (recipient_id, actor_id, type, post_id, text)
    VALUES (?, ?, ?, ?, ?)
  `).run(recipientId, actorId, type, postId, text);

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

module.exports = { db, formatUser, formatPost, POST_QUERY, timeAgo, sendNotification };
