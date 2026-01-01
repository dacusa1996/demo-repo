const db = require('../db');

async function getDepartmentId(deptName) {
  if (!deptName) return null;
  const [rows] = await db.execute('SELECT id FROM departments WHERE name = ? LIMIT 1', [deptName]);
  if (rows && rows[0]) return rows[0].id;
  const [res] = await db.execute('INSERT INTO departments (name, code) VALUES (?,?)', [deptName, deptName.slice(0, 8).toUpperCase()]);
  return res.insertId || res.lastInsertId;
}

function codeFrom(value, len, fallback) {
  const clean = (value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  const padded = (clean || fallback).padEnd(len, 'X');
  return padded.slice(0, len);
}

function normalizePrefix(rawPrefix, department, category) {
  const deptCode = codeFrom(department, 3, 'GEN');
  const catCode = codeFrom(category, 3, 'AST');
  if (rawPrefix) {
    const upper = rawPrefix.toUpperCase();
    // keep only first three segments if provided, ensure ADM prefix
    const parts = upper.split('-').filter(Boolean);
    const base = parts[0] === 'ADM' ? parts.slice(0, 3) : ['ADM', deptCode, catCode];
    while (base.length < 3) base.push(base.length === 1 ? deptCode : catCode);
    return base.slice(0, 3).join('-');
  }
  return `ADM-${deptCode}-${catCode}`;
}

async function generateStructuredTag(rawPrefix, department, category) {
  const prefix = normalizePrefix(rawPrefix, department, category);
  const likePattern = `${prefix}-%`;
  const [rows] = await db.execute('SELECT COUNT(*) AS c FROM assets WHERE asset_tag LIKE ?', [likePattern]);
  const nextSeq = (rows && rows[0] && rows[0].c ? rows[0].c : 0) + 1;
  const seq = String(nextSeq).padStart(4, '0');
  return `${prefix}-${seq}`;
}

async function ensureCondColumn() {
  try {
    const [cols] = await db.execute(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'assets' AND column_name = 'cond' LIMIT 1"
    );
    if (!cols || !cols[0]) {
      await db.execute("ALTER TABLE assets ADD COLUMN cond VARCHAR(64) DEFAULT 'good'");
    }
  } catch (err) {
    console.error('ensureCondColumn error', err);
  }
}

async function ensureTagDateColumns() {
  try {
    const needed = [
      { name: 'tag_year', ddl: 'ALTER TABLE assets ADD COLUMN tag_year INT' },
      { name: 'tag_month', ddl: 'ALTER TABLE assets ADD COLUMN tag_month TINYINT' },
      { name: 'tag_day', ddl: 'ALTER TABLE assets ADD COLUMN tag_day TINYINT' },
    ];
    for (const col of needed) {
      const [rows] = await db.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'assets' AND column_name = ? LIMIT 1",
        [col.name]
      );
      if (!rows || !rows[0]) {
        await db.execute(col.ddl);
      }
    }
  } catch (err) {
    console.error('ensureTagDateColumns error', err);
  }
}

exports.list = async (req, res) => {
  try {
    await ensureCondColumn();
    await ensureTagDateColumns();
    const [rows] = await db.execute(`
      SELECT a.id, a.asset_tag, a.tag_year, a.tag_month, a.tag_day, a.name, a.category, a.department_id, a.cond AS cond, a.status, a.location, a.description, a.purchase_date, a.created_at, d.name AS department
      FROM assets a
      LEFT JOIN departments d ON a.department_id = d.id
      ORDER BY a.id DESC
    `);
    res.json({ success: true, data: { assets: rows } });
  } catch (err) {
    console.error('List assets error', err);
    res.status(500).json({ success: false, error: 'Failed to fetch assets' });
  }
};

exports.create = async (req, res) => {
  try {
    await ensureCondColumn();
    await ensureTagDateColumns();
    const { name, asset_tag, category, department, condition, status, location, description, purchase_date } = req.body || {};
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    const finalTag = await generateStructuredTag(asset_tag && asset_tag.trim(), department, category);
    const deptId = await getDepartmentId(department);
    const cond = condition || 'good';
    const assetStatus = status || 'available';
    const now = purchase_date ? new Date(purchase_date) : new Date();
    const tagYear = now.getFullYear();
    const tagMonth = now.getMonth() + 1;
    const tagDay = now.getDate();

    await db.execute(
      `INSERT INTO assets (name, asset_tag, tag_year, tag_month, tag_day, category, department_id, cond, status, location, description, purchase_date)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [name, finalTag, tagYear, tagMonth, tagDay, category, deptId, cond, assetStatus, location, description, purchase_date || null]
    );

    res.status(201).json({ success: true, data: { asset_tag: finalTag } });
  } catch (err) {
    console.error('Create asset error', err);
    const msg = err && err.code === 'ER_DUP_ENTRY' ? 'Asset tag already exists' : 'Failed to create asset';
    res.status(400).json({ success: false, error: msg });
  }
};

exports.update = async (req, res) => {
  try {
    const assetId = req.params.id;
    if (!assetId) return res.status(400).json({ success: false, error: 'Asset id required' });

    await ensureCondColumn();
    await ensureTagDateColumns();

    const { name, asset_tag, category, department, condition, status, location, description, tag_year, tag_month, tag_day } = req.body || {};
    const updates = [];
    const params = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (asset_tag) { updates.push('asset_tag = ?'); params.push(asset_tag); }
    if (category) { updates.push('category = ?'); params.push(category); }
    if (location) { updates.push('location = ?'); params.push(location); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (condition) { updates.push('cond = ?'); params.push(condition); }
    if (status) { updates.push('status = ?'); params.push(status); }
    if (tag_year) { updates.push('tag_year = ?'); params.push(tag_year); }
    if (tag_month) { updates.push('tag_month = ?'); params.push(tag_month); }
    if (tag_day) { updates.push('tag_day = ?'); params.push(tag_day); }

    if (department !== undefined) {
      const deptId = await getDepartmentId(department);
      updates.push('department_id = ?');
      params.push(deptId);
    }

    if (!updates.length) return res.status(400).json({ success: false, error: 'No fields to update' });

    params.push(assetId);
    const sql = `UPDATE assets SET ${updates.join(', ')} WHERE id = ?`;
    await db.execute(sql, params);

    res.json({ success: true });
  } catch (err) {
    console.error('Update asset error', err);
    const msg = err && err.code === 'ER_DUP_ENTRY' ? 'Asset tag already exists' : 'Failed to update asset';
    res.status(400).json({ success: false, error: msg });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const assetId = req.params.id;
    if (!assetId) return res.status(400).json({ success: false, error: 'Asset id required' });
    await ensureCondColumn();
    const { status, condition } = req.body || {};
    if (!status && !condition) return res.status(400).json({ success: false, error: 'Status or condition required' });
    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (condition) { updates.push('cond = ?'); params.push(condition); }
    params.push(assetId);
    const sql = `UPDATE assets SET ${updates.join(', ')} WHERE id = ?`;
    await db.execute(sql, params);
    res.json({ success: true });
  } catch (err) {
    console.error('Update asset status error', err);
    res.status(400).json({ success: false, error: 'Failed to update status' });
  }
};

exports.remove = async (req, res) => {
  try {
    const assetId = req.params.id;
    if (!assetId) return res.status(400).json({ success: false, error: 'Asset id required' });
    await db.execute('DELETE FROM assets WHERE id = ?', [assetId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete asset error', err);
    res.status(400).json({ success: false, error: 'Failed to delete asset' });
  }
};
