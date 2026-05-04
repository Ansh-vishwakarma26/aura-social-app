require('dotenv').config();
const { Pool } = require('pg');

console.log('DATABASE_URL:', process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aura',
});

async function test() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected successfully');
    const res = await client.query('SELECT NOW()');
    console.log('Result:', res.rows[0]);
    client.release();
  } catch (err) {
    console.error('❌ Connection failed:');
    console.error(err);
  } finally {
    await pool.end();
  }
}

test();
