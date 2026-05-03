require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db } = require('./database');

console.log('🌱 Seeding Aura database...');

// ─── Only seed if database is empty ──────────────────────────────────────────
const existingCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (existingCount > 0) {
  console.log(`ℹ️  Database already has ${existingCount} users — skipping seed to preserve existing accounts.`);
  console.log('   To force a fresh seed, delete server/aura.db and run this script again.');
  process.exit(0);
}

const hash = bcrypt.hashSync('password123', 10);

// ─── Users ────────────────────────────────────────────────────────────────────
const users = [
  { username: 'sarah_adventures', email: 'sarah@aura.app', full_name: 'Sarah Jenkins', bio: 'Tech enthusiast | Travel lover 🌍 | Coffee enthusiast ☕️', mbti: 'ENFP', avatar_url: 'https://images.unsplash.com/photo-1672819030217-a1ad8307e629?w=200&h=200&fit=crop', cover_image_url: 'https://images.unsplash.com/photo-1776536025707-9a0a915f85a5?w=1080&q=80' },
  { username: 'alex_designs', email: 'alex@aura.app', full_name: 'Alex Rivera', bio: 'UX Designer 🎨 | Building cool stuff', mbti: 'INTJ', avatar_url: 'https://images.unsplash.com/flagged/photo-1554391812-b02bb159a2bf?w=200&h=200&fit=crop', cover_image_url: '' },
  { username: 'aura_highlights', email: 'highlights@aura.app', full_name: 'Aura Highlights', bio: 'Official page for community activities 🎉', mbti: 'ESFJ', avatar_url: 'https://images.unsplash.com/photo-1763890498955-13f109b2fbd7?w=200&h=200&fit=crop', cover_image_url: '' },
  { username: 'jordan_code', email: 'jordan@aura.app', full_name: 'Jordan Smith', bio: 'Full stack developer | Open source lover', mbti: 'INTP', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', cover_image_url: '' },
  { username: 'emma_creative', email: 'emma@aura.app', full_name: 'Emma Chen', bio: 'Designer & Artist | Coffee & Creativity', mbti: 'ENFJ', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop', cover_image_url: '' },
];

const insertUser = db.prepare(`
  INSERT INTO users (username, email, password_hash, full_name, bio, mbti, avatar_url, cover_image_url)
  VALUES (@username, @email, @hash, @full_name, @bio, @mbti, @avatar_url, @cover_image_url)
`);

const userIds = {};
for (const u of users) {
  const r = insertUser.run({ ...u, hash });
  userIds[u.username] = r.lastInsertRowid;
}

const sarah = userIds['sarah_adventures'];
const alex = userIds['alex_designs'];
const auraH = userIds['aura_highlights'];
const jordan = userIds['jordan_code'];
const emma = userIds['emma_creative'];

// ─── Posts ────────────────────────────────────────────────────────────────────
const insertPost = db.prepare('INSERT INTO posts (user_id, caption, image_url, created_at) VALUES (?, ?, ?, ?)');

const now = new Date();
const hoursAgo = (h) => new Date(now - h * 3600000).toISOString();

const p1 = insertPost.run(alex, "Late night work session at the new downtown cafe! The espresso here is exactly what I need to finish this project. ☕️💻 #AuraLife", "https://images.unsplash.com/photo-1555531469-561be9b3cb17?w=800&q=80", hoursAgo(2)).lastInsertRowid;
const p2 = insertPost.run(auraH, "Community group sign-ups are now open for the month! Join us at the community center tomorrow. Groups available for all interests.", "https://images.unsplash.com/photo-1520569495996-b5e1219cb625?w=800&q=80", hoursAgo(5)).lastInsertRowid;
const p3 = insertPost.run(sarah, "Finally found my favorite spot in the co-working space empty! Ready to grind on these side projects. 👩‍💻✨", "https://images.unsplash.com/photo-1501503069356-3c6b82a17d89?w=800&q=80", hoursAgo(24)).lastInsertRowid;
const p4 = insertPost.run(emma, "Just wrapped up this new illustration series I've been working on! Inspired by late summer evenings. 🎨🌅", "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80", hoursAgo(36)).lastInsertRowid;
const p5 = insertPost.run(jordan, "Shipped my first open source library today! It's a utility belt for TypeScript developers. Check it out! 🚀", "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80", hoursAgo(48)).lastInsertRowid;

// ─── Likes ────────────────────────────────────────────────────────────────────
const insertLike = db.prepare('INSERT OR IGNORE INTO likes (user_id, post_id) VALUES (?, ?)');
[[sarah, p1], [sarah, p2], [alex, p3], [jordan, p3], [emma, p1], [auraH, p3], [jordan, p4], [alex, p5], [sarah, p5], [emma, p5]].forEach(([u, p]) => insertLike.run(u, p));

// ─── Comments ─────────────────────────────────────────────────────────────────
const insertComment = db.prepare('INSERT INTO comments (user_id, post_id, text, created_at) VALUES (?, ?, ?, ?)');
insertComment.run(sarah, p1, "Good luck with the project! You got this! ☕️", hoursAgo(1));
insertComment.run(jordan, p1, "That place has the best espresso in town!", hoursAgo(0.5));
insertComment.run(sarah, p2, "Signing up right now! So excited 🎉", hoursAgo(4));
insertComment.run(alex, p3, "Looks like such a productive setup!", hoursAgo(23));
insertComment.run(jordan, p4, "This is absolutely stunning Emma!", hoursAgo(34));
insertComment.run(sarah, p5, "Congrats Jordan! That's huge 🚀", hoursAgo(47));

// ─── Bookmarks ────────────────────────────────────────────────────────────────
const insertBookmark = db.prepare('INSERT OR IGNORE INTO bookmarks (user_id, post_id) VALUES (?, ?)');
[[sarah, p1], [sarah, p4], [alex, p3]].forEach(([u, p]) => insertBookmark.run(u, p));

// ─── Follows ──────────────────────────────────────────────────────────────────
const insertFollow = db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)');
[[sarah, alex], [sarah, auraH], [sarah, emma], [alex, sarah], [alex, jordan], [jordan, sarah], [emma, sarah], [auraH, sarah]].forEach(([f, g]) => insertFollow.run(f, g));

// ─── Notifications ────────────────────────────────────────────────────────────
const insertNotif = db.prepare(`INSERT INTO notifications (recipient_id, actor_id, type, post_id, text, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
insertNotif.run(sarah, alex, 'like', p3, '', 0, hoursAgo(0.2));
insertNotif.run(sarah, auraH, 'comment', p3, "Can't wait to see what you build!", 0, hoursAgo(1));
insertNotif.run(sarah, alex, 'follow', null, '', 1, hoursAgo(48));
insertNotif.run(alex, sarah, 'like', p1, '', 0, hoursAgo(0.5));
insertNotif.run(emma, jordan, 'comment', p4, "This is absolutely stunning Emma!", 0, hoursAgo(34));

console.log('✅ Database seeded successfully!');
console.log('\n📧 Login credentials:');
users.forEach(u => console.log(`   ${u.email} / password123`));
