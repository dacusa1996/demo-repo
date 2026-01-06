const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');

async function ensureResetTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      email VARCHAR(191) NOT NULL,
      role VARCHAR(64) NOT NULL,
      status VARCHAR(32) DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });

    const [rows] = await db.execute('SELECT id, name, email, password_hash, role_id, department_id, is_active FROM users WHERE email = ? LIMIT 1', [email]);
    if (!rows || rows.length === 0) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const userRow = rows[0];

    if (userRow.is_active === 0 || userRow.is_active === false) {
      return res.status(403).json({ success: false, error: 'Account disabled' });
    }

    if (!bcrypt.compareSync(password, userRow.password_hash)) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    // get role name
    const [roleRows] = await db.execute('SELECT name FROM roles WHERE id = ? LIMIT 1', [userRow.role_id]);
    const roleName = roleRows && roleRows[0] ? roleRows[0].name : 'clerk';

    const [deptRows] = await db.execute('SELECT name FROM departments WHERE id = ? LIMIT 1', [userRow.department_id]);
    const deptName = deptRows && deptRows[0] ? deptRows[0].name : '';

    const token = jwt.sign({ id: userRow.id, role: roleName, email: userRow.email, department: deptName, name: userRow.name }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '8h' });

    return res.json({ success: true, data: { user: { id: userRow.id, name: userRow.name, email: userRow.email, role: roleName, department: deptName }, token } });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.register = async (req, res) => {
  // For scaffold: prevent open registration. Admin should create users.
  return res.status(501).json({ success: false, error: 'Registration disabled. Use seed or admin API.' });
};

// Allow clerks / dept heads to request password reset
exports.forgot = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email required' });
    const [rows] = await db.execute(
      `SELECT u.id, u.email, u.name, u.role_id, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.email = ? LIMIT 1`,
      [email]
    );
    if (!rows || !rows.length) return res.status(404).json({ success: false, error: 'User not found' });
    const userRow = rows[0];
    const role = (userRow.role_name || '').toLowerCase();
    if (role !== 'clerk' && role !== 'dept head' && role !== 'department head') {
      return res.status(403).json({ success: false, error: 'Only clerks or dept heads can request reset' });
    }
    await ensureResetTable();
    await db.execute(
      `INSERT INTO password_reset_requests (user_id, email, role) VALUES (?,?,?)`,
      [userRow.id, userRow.email, userRow.role_name || role]
    );
    return res.json({ success: true, message: 'Reset request submitted' });
  } catch (err) {
    console.error('Forgot error', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Admin: list reset requests
exports.listResets = async (req, res) => {
  try {
    await ensureResetTable();
    const [rows] = await db.execute(
      `SELECT pr.id, pr.email, pr.role, pr.status, pr.created_at, pr.resolved_at, u.name
       FROM password_reset_requests pr
       LEFT JOIN users u ON pr.user_id = u.id
       WHERE pr.status = 'PENDING'
       ORDER BY pr.id DESC`
    );
    return res.json({ success: true, data: { requests: rows || [] } });
  } catch (err) {
    console.error('List resets error', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Admin: resolve and set new password
exports.resolveReset = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!id || !password) return res.status(400).json({ success: false, error: 'Reset id and password required' });
    await ensureResetTable();
    const [rows] = await db.execute(`SELECT pr.*, u.id AS uid FROM password_reset_requests pr LEFT JOIN users u ON pr.user_id = u.id WHERE pr.id = ? LIMIT 1`, [id]);
    if (!rows || !rows.length) return res.status(404).json({ success: false, error: 'Reset request not found' });
    const rec = rows[0];
    if (rec.status !== 'PENDING') return res.status(400).json({ success: false, error: 'Already processed' });
    const hash = bcrypt.hashSync(password, 10);
    await db.execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, rec.user_id]);
    await db.execute(`UPDATE password_reset_requests SET status = 'COMPLETED', resolved_at = NOW() WHERE id = ?`, [id]);
    return res.json({ success: true, message: 'Password reset and request closed' });
  } catch (err) {
    console.error('Resolve reset error', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};
