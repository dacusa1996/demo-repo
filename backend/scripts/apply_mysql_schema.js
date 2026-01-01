/**
 * Create MySQL schema for ADMAS local development.
 * Run: node scripts/apply_mysql_schema.js (ensure .env or env vars are set)
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'db',
    port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 3306,
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
  });

  const dbName = process.env.DATABASE_NAME || 'admas_dev';
    console.log('Creating database if not exists:', dbName);
    await conn.query("CREATE DATABASE IF NOT EXISTS `" + dbName + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  await conn.changeUser({ database: dbName });

  console.log('Creating tables...');
  const sql = `
    CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(191) UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(191) UNIQUE,
      code VARCHAR(32)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(191) NOT NULL,
      email VARCHAR(191) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role_id INT NOT NULL,
      department_id INT,
      is_active TINYINT DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id),
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      asset_tag VARCHAR(191) UNIQUE,
      tag_year INT,
      tag_month TINYINT,
      tag_day TINYINT,
      name VARCHAR(191) NOT NULL,
      description TEXT,
      category VARCHAR(191),
      department_id INT,
      purchase_date DATE,
      cond VARCHAR(64) DEFAULT 'good',
      status VARCHAR(64) DEFAULT 'available',
      location VARCHAR(191),
      value DOUBLE,
      created_by INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS borrowing_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      asset_id INT NOT NULL,
      requested_by INT NOT NULL,
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      start_date DATE,
      expected_return_date DATE,
      approved_by INT,
      approved_at DATETIME,
      status VARCHAR(64) DEFAULT 'pending',
      actual_return_date DATE,
      return_condition TEXT,
      notes TEXT,
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    );

    CREATE TABLE IF NOT EXISTS maintenance_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      asset_id INT NOT NULL,
      reported_by INT NOT NULL,
      reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      issue TEXT,
      priority VARCHAR(32) DEFAULT 'medium',
      status VARCHAR(64) DEFAULT 'pending',
      assigned_to INT,
      completed_at DATETIME,
      notes TEXT,
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    );

    CREATE TABLE IF NOT EXISTS borrowing_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      asset_id INT NOT NULL,
      borrower_name VARCHAR(191) NOT NULL,
      borrower_department VARCHAR(191),
      creator_department VARCHAR(191),
      request_date DATE,
      expected_return DATE,
      reason TEXT,
      status VARCHAR(32) DEFAULT 'PENDING',
      approved_by VARCHAR(191),
      approved_at DATETIME,
      issued_at DATETIME,
      return_date DATETIME,
      return_condition VARCHAR(64),
      comment TEXT,
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    );
  `;

  // run statements one by one
  const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    try {
      await conn.query(stmt);
    } catch (err) {
      console.error('Error running statement:', err.message || err);
    }
  }

  console.log('Schema applied. You can now run `npm run seed` to seed roles and an admin user.');
  await conn.end();
})();

