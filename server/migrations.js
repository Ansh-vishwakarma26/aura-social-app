const { pool } = require('./database');

async function runMigrations() {
  console.log("🚀 Running database migrations...");

  try {
    // Run queries ONE BY ONE
    // We use INT (0/1) for flags to stay consistent with the application logic
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS push_enabled INT DEFAULT 1;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_enabled INT DEFAULT 1;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_mode INT DEFAULT 0;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_status_enabled INT DEFAULT 1;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private INT DEFAULT 0;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mbti VARCHAR(50) DEFAULT 'INFP';`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_image_url TEXT DEFAULT '';`);

    console.log("✅ Migrations completed successfully");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    // Don't throw the error, just log it so the server can still start
  }
}

module.exports = runMigrations;