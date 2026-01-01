const pool = require('../db');

const normalizeStatus = (val) => {
  const v = (val || '').toLowerCase();
  if (v === 'open' || v === 'pending') return 'pending';
  if (v === 'in_progress') return 'in_progress';
  if (v === 'completed' || v === 'complete') return 'completed';
  return null;
};

exports.list = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT m.id, m.asset_id, m.issue, m.status, m.reported_at, m.reported_by, m.notes, m.priority,
              a.asset_tag, a.name AS asset_name,
              u.name AS reported_by_name
       FROM maintenance_logs m
       LEFT JOIN assets a ON m.asset_id = a.id
       LEFT JOIN users u ON m.reported_by = u.id
       ORDER BY m.id DESC`
    );
    return res.json({ success: true, data: { maintenance: rows } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to list maintenance' });
  }
};

exports.create = async (req, res) => {
  try {
    const { asset_id, issue } = req.body || {};
    if (!asset_id || !issue || !String(issue).trim()) {
      return res.status(400).json({ success: false, error: 'asset_id and issue are required' });
    }
    // prevent duplicate active maintenance for same asset
    const [existing] = await pool.execute(
      `SELECT id FROM maintenance_logs WHERE asset_id = ? AND status IN ('pending','open','in_progress') LIMIT 1`,
      [asset_id]
    );
    if (existing && existing.length) {
      return res.status(400).json({ success: false, error: 'Asset already has an active maintenance record' });
    }
    const reportedBy = (req.user && req.user.id) || null;
    const conn = pool;
    const [result] = await conn.execute(
      `INSERT INTO maintenance_logs (asset_id, issue, status, reported_by)
       VALUES (?,?, 'pending', ?)`,
      [asset_id, issue.trim(), reportedBy]
    );
    // mark asset under maintenance
    await conn.execute(`UPDATE assets SET status = 'under_maintenance' WHERE id = ?`, [asset_id]);
    return res.json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to create maintenance log' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const normalized = normalizeStatus(status);
    if (!normalized) return res.status(400).json({ success: false, error: 'Invalid status' });
    const completedAt = normalized === 'completed' ? new Date() : null;
    const conn = pool;
    await conn.execute(
      `UPDATE maintenance_logs
       SET status = ?, completed_at = ?
       WHERE id = ?`,
      [normalized, completedAt, id]
    );
    // update asset status based on maintenance status
    if (normalized === 'completed') {
      await conn.execute(`UPDATE assets SET status = 'available' WHERE id = (SELECT asset_id FROM maintenance_logs WHERE id = ?)`, [id]);
    } else if (normalized === 'in_progress') {
      await conn.execute(`UPDATE assets SET status = 'under_maintenance' WHERE id = (SELECT asset_id FROM maintenance_logs WHERE id = ?)`, [id]);
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update status' });
  }
};
