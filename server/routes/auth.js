const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, formatUser } = require('../database');
const { authenticate } = require('../middleware/auth');

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, email, password, fullName, mbti } = req.body;
  if (!username || !email || !password || !fullName) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existing) {
    return res.status(409).json({ message: 'Email or username already taken' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, email, password_hash, full_name, mbti) VALUES (?, ?, ?, ?, ?)'
  ).run(username, email, hash, fullName, mbti || 'INFP');

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = signToken(user.id);
  res.status(201).json({ token, user: formatUser(user) });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  const token = signToken(user.id);
  res.json({ token, user: formatUser(user) });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: formatUser(req.user, req.user.id) });
});

module.exports = router;
