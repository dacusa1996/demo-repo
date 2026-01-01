/**
 * Quick DB connectivity check for MySQL.
 * Run: node scripts/check_db.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DATABASE_HOST || '127.0.0.1',
      port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 4000,
      user: process.env.DATABASE_USER || 'root',
      password: process.env.DATABASE_PASSWORD || '',
      database: process.env.DATABASE_NAME || 'admas_dev'
    });
    console.log('Connected to MySQL OK');

    // check users table
    try {
      const [rows] = await conn.execute('SELECT COUNT(*) as c FROM users');
      console.log('users table row count:', rows[0].c);
    } catch (err) {
      console.error('Could not query users table:', err.message || err);
    }

    await conn.end();
  } catch (err) {
    console.error('DB connection failed:', err.message || err);
    process.exit(1);
  }
})();
