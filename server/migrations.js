const { pool } = require('./database');

async function runMigrations() {
  console.log("🚀 Running database migrations...");

  try {
    // Ensure all required columns exist in the users table
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS push_enabled INT DEFAULT 1;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_enabled INT DEFAULT 1;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_mode INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_status_enabled INT DEFAULT 1;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mbti VARCHAR(50) DEFAULT 'INFP';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_image_url TEXT DEFAULT '';
    `);

    console.log("✅ Migrations completed successfully");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  }
}

module.exports = runMigrations;
