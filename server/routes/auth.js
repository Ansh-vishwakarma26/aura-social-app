const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, formatUser } = require('../database');
const { authenticate } = require('../middleware/auth');

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password, fullName, mbti } = req.body;
  if (!username || !email || !password || !fullName) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  
  try {
    const existingRes = await pool.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (existingRes.rowCount > 0) {
      return res.status(409).json({ message: 'Email or username already taken' });
    }
    
    const hash = bcrypt.hashSync(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, full_name, mbti) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [username, email, hash, fullName, mbti || 'INFP']
    );

    const user = result.rows[0];
    const token = signToken(user.id);
    res.status(201).json({ token, user: await formatUser(user) });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = signToken(user.id);
    res.json({ token, user: await formatUser(user) });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: await formatUser(req.user, req.user.id) });
});

module.exports = router;
