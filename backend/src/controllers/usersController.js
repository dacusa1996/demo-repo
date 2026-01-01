const bcrypt = require('bcryptjs');
const db = require('../db');

async function getRoleId(roleName) {
  const name = (roleName || 'clerk').toLowerCase();
  const [rows] = await db.execute('SELECT id FROM roles WHERE name = ? LIMIT 1', [name]);
  if (rows && rows[0]) return rows[0].id;
  const [res] = await db.execute('INSERT INTO roles (name, description) VALUES (?,?)', [name, `${name} role`]);
  return res.insertId || res.lastInsertId;
}

async function getDepartmentId(deptName) {
  if (!deptName) return null;
  const [rows] = await db.execute('SELECT id FROM departments WHERE name = ? LIMIT 1', [deptName]);
  if (rows && rows[0]) return rows[0].id;
  const [res] = await db.execute('INSERT INTO departments (name, code) VALUES (?,?)', [deptName, deptName.slice(0, 8).toUpperCase()]);
  return res.insertId || res.lastInsertId;
}

exports.list = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT u.id, u.name, u.email, u.is_active, r.name AS role, d.name AS department
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.id DESC
    `);
    res.json({ success: true, data: { users: rows } });
  } catch (err) {
    console.error('List users error', err);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, email, password, role, department, status } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    const roleId = await getRoleId(role);
    const deptId = await getDepartmentId(department);
    const hash = bcrypt.hashSync(password, 10);
    const isActive = (status || 'Active').toLowerCase() === 'active' ? 1 : 0;

    await db.execute(
      'INSERT INTO users (name, email, password_hash, role_id, department_id, is_active) VALUES (?,?,?,?,?,?)',
      [name, email, hash, roleId, deptId, isActive]
    );

    res.status(201).json({ success: true, data: { user: { name, email, role: role || 'clerk', department, status: isActive ? 'Active' : 'Disabled' } } });
  } catch (err) {
    console.error('Create user error', err);
    const msg = err && err.code === 'ER_DUP_ENTRY' ? 'Email already exists' : 'Failed to create user';
    res.status(400).json({ success: false, error: msg });
  }
};

exports.update = async (req, res) => {
  try {
    const userId = req.params.id;
    const { role, department, status, name, email } = req.body || {};
    if (!userId) return res.status(400).json({ success: false, error: 'User id required' });

    const updates = [];
    const params = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (email) { updates.push('email = ?'); params.push(email); }

    if (role) {
      const roleId = await getRoleId(role);
      updates.push('role_id = ?');
      params.push(roleId);
    }

    if (department !== undefined) {
      const deptId = await getDepartmentId(department);
      updates.push('department_id = ?');
      params.push(deptId);
    }

    if (status) {
      const isActive = status.toLowerCase() === 'active' ? 1 : 0;
      updates.push('is_active = ?');
      params.push(isActive);
    }

    if (!updates.length) return res.status(400).json({ success: false, error: 'No fields to update' });

    params.push(userId);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await db.execute(sql, params);

    res.json({ success: true });
  } catch (err) {
    console.error('Update user error', err);
    res.status(400).json({ success: false, error: 'Failed to update user' });
  }
};
