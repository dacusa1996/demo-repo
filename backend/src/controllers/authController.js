const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });

    const [rows] = await db.execute('SELECT id, name, email, password_hash, role_id, department_id FROM users WHERE email = ? LIMIT 1', [email]);
    if (!rows || rows.length === 0) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const userRow = rows[0];

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
