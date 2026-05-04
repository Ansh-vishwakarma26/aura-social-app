require('dotenv').config();
const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');

const DB_PATH = path.join(__dirname, 'aura.db');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aura',
});

async function migrate() {
  console.log('🚀 Starting migration from SQLite to PostgreSQL...');
  
  const sqlite = new Database(DB_PATH);
  const client = await pool.connect();

  try {
    // List of tables to migrate in order of dependencies (users first)
    const tables = [
      'users', 
      'posts', 
      'likes', 
      'comments', 
      'bookmarks', 
      'follows', 
      'notifications', 
      'follow_requests', 
      'messages', 
      'blocks', 
      'mutes', 
      'close_friends'
    ];

    for (const table of tables) {
      console.log(`\n📦 Migrating table: ${table}...`);
      
      const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
      if (rows.length === 0) {
        console.log(`   (No rows in ${table})`);
        continue;
      }

      // Prepare Postgres insert
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

      let count = 0;
      for (const row of rows) {
        const values = columns.map(col => {
          let val = row[col];
          // Handle SQLite specific formatting if necessary
          // Note: better-sqlite3 returns numbers for integers and strings for text
          return val;
        });
        
        await client.query(sql, values);
        count++;
      }
      
      // Reset the serial sequence so future inserts don't collide with migrated IDs
      try {
        await client.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1)) FROM ${table}`);
      } catch (seqErr) {
        // Some tables might not have a serial 'id' if they use composite keys or don't use SERIAL
        // but our schema uses SERIAL PRIMARY KEY for all tables.
      }
      
      console.log(`   ✅ Migrated ${count} rows.`);
    }

    console.log('\n✨ Migration complete!');
    console.log('You can now run "npm run server" to start the app with PostgreSQL.');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    sqlite.close();
    await pool.end();
  }
}

migrate();
