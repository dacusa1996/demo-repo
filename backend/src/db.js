require('dotenv').config();
const mysql = require('mysql2/promise');

const host = process.env.DATABASE_HOST || 'db';
const useSslFlag = (process.env.DATABASE_SSL || '').toLowerCase() === 'true';
const useSslHostHint = /rlwy\.net|railway\.app/i.test(host);
const useSsl = useSslFlag || useSslHostHint;

const pool = mysql.createPool({
  host,
  port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 3306,
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'admas_dev',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  connectTimeout: 20000,
  ssl: useSsl ? { rejectUnauthorized: false, servername: host } : undefined
});

module.exports = pool;
