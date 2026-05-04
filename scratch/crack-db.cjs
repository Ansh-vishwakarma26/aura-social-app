const { Client } = require('pg');

const passwords = ['postgres', 'password', '1234', '123456', 'admin', 'root', '123', '12345', 'password123', ''];
const host = 'localhost';
const user = 'VICTUS';
const database = 'postgres';

async function crack() {
  for (const password of passwords) {
    console.log(`Trying password: "${password}"`);
    const client = new Client({
      host,
      user,
      password,
      database,
    });
    try {
      await client.connect();
      console.log(`✅ SUCCESS! Password is: "${password}"`);
      await client.end();
      return;
    } catch (err) {
      console.log(`❌ Failed: ${err.message}`);
    }
  }
  console.log('❌ Could not find password in common list.');
}

crack();
