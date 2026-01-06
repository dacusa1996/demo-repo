require('dotenv').config();
const mysql = require('mysql2/promise');

const useSsl = (process.env.DATABASE_SSL || '').toLowerCase() === 'true';

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST || 'db',
  port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 3306,
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'admas_dev',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined
});

module.exports = pool;
