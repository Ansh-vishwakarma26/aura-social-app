require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';
const DIST_DIR = path.join(__dirname, '..', 'dist');

// ─── CORS ─────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3001'];

app.use(cors({
  origin: IS_PROD ? true : allowedOrigins,  // in prod, same-origin requests only need '*'
  credentials: true,
}));

// ─── Body parsing ────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Static files ───────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve built frontend in production
const fs = require('fs');
if (IS_PROD && fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  console.log('📦 Serving built frontend from', DIST_DIR);
}

// ─── API Routes ───────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/posts',         require('./routes/posts'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/explore',       require('./routes/explore'));
app.use('/api/messages',      require('./routes/messages'));
app.use('/api/upload',        require('./routes/upload'));

// Bookmarks shortcut (/api/bookmarks → explore router)
app.use('/api', require('./routes/explore'));

// ─── Health check ───────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── SPA fallback (serve index.html for all non-API routes in prod) ─────────
// This lets React Router handle /profile, /login, etc. on page refresh.
if (IS_PROD && fs.existsSync(DIST_DIR)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// ─── Global error handler ────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const { initDB } = require('./database');
const runMigrations = require('./migrations');

async function startServer() {
  // Initialize base schema and then run migrations
  await initDB();
  await runMigrations();

  app.listen(PORT, () => {
    console.log(`🚀 Aura API running on http://localhost:${PORT}`);
    console.log(`💾 Mode: ${IS_PROD ? 'production' : 'development'}`);
    console.log(`🗄️  Database: PostgreSQL`);
  });
}

startServer();

// Prevent server from crashing on unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err.message);
});

