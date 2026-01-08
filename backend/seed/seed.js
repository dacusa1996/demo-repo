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
    await conn.execute("INSERT IGNORE INTO departments (name, code) VALUES (?,?)", ['Marketing', 'MKT']);
    await conn.execute("INSERT IGNORE INTO departments (name, code) VALUES (?,?)", ['Operations', 'OPS']);

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
      { tag: 'ADM-IT-LAP-0101', year: 2025, month: 1, day: 10, name: 'Laptop - Dell Latitude 7440', category: 'Laptop', dept: 'IT', cond: 'good', status: 'available', location: 'IT Storage', desc: 'Spare engineering laptop' },
      { tag: 'ADM-IT-MON-0102', year: 2025, month: 1, day: 14, name: 'Monitor - Dell U2723QE', category: 'Monitor', dept: 'IT', cond: 'good', status: 'available', location: 'IT Storage', desc: '4K monitor' },
      { tag: 'ADM-IT-APS-0103', year: 2025, month: 2, day: 2, name: 'Access Point - Ubiquiti U6-LR', category: 'Network', dept: 'IT', cond: 'good', status: 'maintenance', location: 'Server Room', desc: 'Firmware update pending' },
      { tag: 'ADM-IT-SVR-0104', year: 2025, month: 2, day: 18, name: 'Server - HPE ProLiant DL360', category: 'Server', dept: 'IT', cond: 'fair', status: 'available', location: 'Data Center', desc: 'Lab virtualization host' },
      { tag: 'ADM-FIN-PRN-0105', year: 2025, month: 3, day: 4, name: 'Printer - HP LaserJet M506', category: 'Printer', dept: 'Finance', cond: 'good', status: 'available', location: 'Finance Office', desc: 'Shared finance printer' },
      { tag: 'ADM-FIN-SCN-0106', year: 2025, month: 3, day: 12, name: 'Scanner - Epson DS-870', category: 'Scanner', dept: 'Finance', cond: 'good', status: 'available', location: 'Finance Front Desk', desc: 'Invoice scanning' },
      { tag: 'ADM-FIN-LAP-0107', year: 2025, month: 4, day: 1, name: 'Laptop - ThinkPad T14s', category: 'Laptop', dept: 'Finance', cond: 'good', status: 'borrowed', location: 'Finance Office', desc: 'CFO travel laptop' },
      { tag: 'ADM-HR-PRO-0108', year: 2025, month: 4, day: 16, name: 'Projector - Epson EB-2250U', category: 'Projector', dept: 'HR', cond: 'good', status: 'available', location: 'HR Training Room', desc: 'Training projector' },
      { tag: 'ADM-HR-LAP-0109', year: 2025, month: 4, day: 22, name: 'Laptop - HP EliteBook 840', category: 'Laptop', dept: 'HR', cond: 'good', status: 'available', location: 'HR Locker', desc: 'HR field laptop' },
      { tag: 'ADM-HR-CHA-0110', year: 2025, month: 5, day: 3, name: 'Chair - Steelcase Series 1', category: 'Furniture', dept: 'HR', cond: 'good', status: 'available', location: 'HR Storage', desc: 'New hire seating' },
      { tag: 'ADM-MKT-CAM-0111', year: 2025, month: 5, day: 9, name: 'Camera - Canon R8', category: 'Camera', dept: 'Marketing', cond: 'good', status: 'available', location: 'Studio Cabinet', desc: 'Campaign shoots' },
      { tag: 'ADM-MKT-LGT-0112', year: 2025, month: 5, day: 20, name: 'Lighting - Neewer Panel Kit', category: 'Lighting', dept: 'Marketing', cond: 'good', status: 'available', location: 'Studio Cabinet', desc: 'Photo/video lighting' },
      { tag: 'ADM-OPS-FUR-0113', year: 2025, month: 6, day: 6, name: 'Desk - Uplift Standing V2', category: 'Furniture', dept: 'Operations', cond: 'good', status: 'available', location: 'Ops Storage', desc: 'Spare standing desk' },
      { tag: 'ADM-OPS-UPS-0114', year: 2025, month: 6, day: 18, name: 'UPS - APC Smart-UPS 1500', category: 'Power', dept: 'Operations', cond: 'good', status: 'available', location: 'Server Room', desc: 'Backup power unit' },
      { tag: 'ADM-IT-PHN-0115', year: 2025, month: 7, day: 1, name: 'Phone - iPhone 14', category: 'Mobile', dept: 'IT', cond: 'good', status: 'borrowed', location: 'IT Checkout', desc: 'Test device' },
      { tag: 'ADM-IT-TBL-0116', year: 2025, month: 7, day: 12, name: 'Tablet - iPad Air', category: 'Tablet', dept: 'IT', cond: 'good', status: 'available', location: 'IT Checkout', desc: 'Demo tablet' },
      { tag: 'ADM-FIN-FIL-0117', year: 2025, month: 8, day: 2, name: 'Filing Cabinet - 4 Drawer', category: 'Furniture', dept: 'Finance', cond: 'good', status: 'available', location: 'Finance Storage', desc: 'Archive storage' },
      { tag: 'ADM-HR-MIC-0118', year: 2025, month: 8, day: 14, name: 'Microphone - Rode PodMic', category: 'Audio', dept: 'HR', cond: 'good', status: 'maintenance', location: 'HR Training Room', desc: 'Cable replacement needed' }
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
