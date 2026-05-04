const { pool } = require('./database');

async function runMigrations() {
  console.log("🚀 Running database migrations...");

  try {
    // Run queries ONE BY ONE (important)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT true;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT true;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_mode BOOLEAN DEFAULT false;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_status_enabled BOOLEAN DEFAULT true;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mbti VARCHAR(50) DEFAULT 'INFP';`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_image_url TEXT DEFAULT '';`);

    console.log("✅ Migrations completed successfully");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  }
}

module.exports = runMigrations;