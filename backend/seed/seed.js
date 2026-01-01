/**
 * Seed script for ADMAS (MySQL).
 * Usage: set DB env vars (or create .env) then run `npm run seed`
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function ensureTagYearColumn(conn) {
  try {
    const [cols] = await conn.execute(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'assets' AND column_name = 'tag_year' LIMIT 1"
    );
    if (!cols || !cols[0]) {
      await conn.execute("ALTER TABLE assets ADD COLUMN tag_year INT");
    }
  } catch (err) {
    console.error('ensureTagYearColumn (seed) error:', err.message || err);
  }
}

async function ensureTagMonthDayColumns(conn) {
  try {
    const cols = [
      { name: 'tag_month', ddl: 'ALTER TABLE assets ADD COLUMN tag_month TINYINT' },
      { name: 'tag_day', ddl: 'ALTER TABLE assets ADD COLUMN tag_day TINYINT' }
    ];
    for (const col of cols) {
      const [rows] = await conn.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'assets' AND column_name = ? LIMIT 1",
        [col.name]
      );
      if (!rows || !rows[0]) {
        await conn.execute(col.ddl);
      }
    }
  } catch (err) {
    console.error('ensureTagMonthDayColumns (seed) error:', err.message || err);
  }
}

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST || "db",
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USER || "root",
    password: process.env.DATABASE_PASSWORD || "rootpassword",
    database: process.env.DATABASE_NAME || "admas_dev",
  });

  try {
    console.log('Connected to DB, seeding...');
    await ensureTagYearColumn(conn);
    await ensureTagMonthDayColumns(conn);

    // Insert roles (use INSERT IGNORE for idempotence)
    await conn.execute("INSERT IGNORE INTO roles (name, description) VALUES (?,?)", ['admin', 'System administrator']);
    await conn.execute("INSERT IGNORE INTO roles (name, description) VALUES (?,?)", ['department_head', 'Department head']);
    await conn.execute("INSERT IGNORE INTO roles (name, description) VALUES (?,?)", ['clerk', 'Clerk / user']);

    // Insert departments
    await conn.execute("INSERT IGNORE INTO departments (name, code) VALUES (?,?)", ['IT', 'IT']);
    await conn.execute("INSERT IGNORE INTO departments (name, code) VALUES (?,?)", ['Finance', 'FIN']);
    await conn.execute("INSERT IGNORE INTO departments (name, code) VALUES (?,?)", ['HR', 'HR']);

    // Create admin user
    const seedPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
    const passwordHash = bcrypt.hashSync(seedPassword, 10);

    // find admin role id
    const [roles] = await conn.execute("SELECT id FROM roles WHERE name = 'admin' LIMIT 1");
    const adminRoleId = roles && roles[0] ? roles[0].id : 1;

    await conn.execute("INSERT IGNORE INTO users (name,email,password_hash,role_id) VALUES (?,?,?,?)", ['System Admin','admin@admas.local', passwordHash, adminRoleId]);

    // Grab ids for helper inserts
    const [[adminUserRow]] = await conn.execute("SELECT id FROM users WHERE email = 'admin@admas.local' LIMIT 1");
    const adminUserId = adminUserRow ? adminUserRow.id : null;

    const deptMap = {};
    const [deptRows] = await conn.execute("SELECT id, name FROM departments");
    deptRows.forEach((d) => { deptMap[d.name] = d.id; });

    // Seed placeholder assets (insert ignore to avoid duplicates on rerun)
    const assets = [
      { tag: 'ADM-IT-LAP-0001', year: 2025, month: 1, day: 12, name: 'Laptop - MacBook Pro 14', category: 'Laptop', dept: 'IT', cond: 'good', status: 'available', location: 'HQ-IT-Desk', desc: 'Developer workstation' },
      { tag: 'ADM-FIN-PRN-0002', year: 2025, month: 2, day: 8, name: 'Printer - Brother HL-L8360', category: 'Printer', dept: 'Finance', cond: 'good', status: 'available', location: 'Finance Floor', desc: 'Finance shared printer' },
      { tag: 'ADM-HR-PROJ-0003', year: 2025, month: 3, day: 15, name: 'Projector - BenQ HT3550', category: 'Projector', dept: 'HR', cond: 'good', status: 'borrowed', location: 'HR Training Room', desc: 'Training presentations' },
      { tag: 'ADM-IT-CAM-0004', year: 2025, month: 4, day: 3, name: 'Camera - Sony A7 IV', category: 'Camera', dept: 'IT', cond: 'good', status: 'maintenance', location: 'Media Cabinet', desc: 'Lens calibration scheduled' },
      { tag: 'ADM-IT-NET-0005', year: 2025, month: 4, day: 20, name: 'Switch - Juniper EX4300', category: 'Network', dept: 'IT', cond: 'good', status: 'available', location: 'Server Room', desc: 'Core switch stack' },
      { tag: 'ADM-MKT-CAM-0006', year: 2025, month: 5, day: 6, name: 'Camera - Canon R7', category: 'Camera', dept: 'Marketing', cond: 'good', status: 'available', location: 'Studio Rack', desc: 'Campaign shoots' },
      { tag: 'ADM-OPS-FURN-0007', year: 2025, month: 5, day: 22, name: 'Desk - Uplift Standing', category: 'Furniture', dept: 'Operations', cond: 'good', status: 'available', location: 'Ops Storage', desc: 'Spare standing desk' },
      { tag: 'ADM-IT-SVR-0008', year: 2025, month: 6, day: 2, name: 'Server - Dell R740', category: 'Server', dept: 'IT', cond: 'fair', status: 'available', location: 'Data Center', desc: 'Virtualization host' },
      { tag: 'ADM-HR-LAP-0009', year: 2025, month: 6, day: 18, name: 'Laptop - ThinkPad X1 Carbon', category: 'Laptop', dept: 'HR', cond: 'good', status: 'available', location: 'HR Locker', desc: 'HR field laptop' },
      { tag: 'ADM-FIN-SCN-0010', year: 2025, month: 7, day: 9, name: 'Scanner - Fujitsu fi-8170', category: 'Scanner', dept: 'Finance', cond: 'good', status: 'available', location: 'Finance Front Desk', desc: 'Invoice scanning' },
      { tag: 'ADM-OPS-CHA-0011', year: 2025, month: 7, day: 21, name: 'Chair - Herman Miller Aeron', category: 'Furniture', dept: 'Operations', cond: 'good', status: 'available', location: 'Ops Storage', desc: 'Ergo chair spare' },
      { tag: 'ADM-IT-MON-0012', year: 2025, month: 8, day: 5, name: 'Monitor - LG 34WN80C', category: 'Monitor', dept: 'IT', cond: 'good', status: 'available', location: 'HQ-IT-Desk', desc: 'Ultrawide monitor' }
    ];

    for (const asset of assets) {
      const deptId = deptMap[asset.dept] || null;
      await conn.execute(
        "INSERT IGNORE INTO assets (asset_tag, tag_year, tag_month, tag_day, name, category, department_id, cond, status, location, description, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        [asset.tag, asset.year, asset.month, asset.day, asset.name, asset.category, deptId, asset.cond, asset.status, asset.location, asset.desc, adminUserId]
      );
    }

    console.log('Seeding complete. Admin user email: admin@admas.local, password:', seedPassword);
  } catch (err) {
    console.error('Seeding error:', err.message || err);
  } finally {
    await conn.end();
  }
})();
