const db = require('../db');

async function ensureRequestsTable() {
  try {
    await db.execute(`
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
      )
    `);
    // ensure creator_department exists if table already created
    const [col] = await db.execute(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'borrowing_requests' AND column_name = 'creator_department' LIMIT 1"
    );
    if (!col || !col[0]) {
      await db.execute("ALTER TABLE borrowing_requests ADD COLUMN creator_department VARCHAR(191)");
    }
  } catch (err) {
    console.error('ensureRequestsTable error', err);
  }
}

exports.list = async (req, res) => {
  try {
    await ensureRequestsTable();
    const { status } = req.query;
    const role = (req.user && req.user.role) || '';
    const dept = (req.user && req.user.department) || '';

    let sql = `
      SELECT r.id, r.asset_id, r.borrower_name, r.borrower_department, r.creator_department, r.request_date, r.expected_return, r.reason, r.status,
             r.approved_by, r.approved_at, r.issued_at, r.return_date, r.return_condition, r.comment,
             a.asset_tag, a.name AS asset_name
      FROM borrowing_requests r
      LEFT JOIN assets a ON r.asset_id = a.id
    `;
    const params = [];
    const where = [];

    if (status) {
      where.push('r.status = ?');
      params.push(status.toUpperCase());
    }
    if (role && role.toLowerCase() !== 'admin' && dept) {
      // only respect the creator's department for visibility
      where.push('r.creator_department = ?');
      params.push(dept);
    }
    if (where.length) {
      sql += ' WHERE ' + where.join(' AND ');
    }
    sql += ' ORDER BY r.id DESC';

    const [rows] = await db.execute(sql, params);
    res.json({ success: true, data: { requests: rows } });
  } catch (err) {
    console.error('List requests error', err);
    res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
};

exports.create = async (req, res) => {
  try {
    await ensureRequestsTable();
    const { asset_id, borrower_name, borrower_department, expected_return, reason } = req.body || {};
    if (!asset_id || !borrower_name) {
      return res.status(400).json({ success: false, error: 'Asset and borrower are required' });
    }

    const creatorDept = (req.user && req.user.department) || null;
    const borrowerDeptVal = borrower_department || creatorDept || null;

    const [result] = await db.execute(
      'INSERT INTO borrowing_requests (asset_id, borrower_name, borrower_department, creator_department, request_date, expected_return, reason, status) VALUES (?,?,?,?,?,?,?,?)',
      [asset_id, borrower_name, borrowerDeptVal, creatorDept, new Date(), expected_return || null, reason || null, 'PENDING']
    );

    const insertedId = result.insertId || result.lastInsertId;
    let inserted = null;
    if (insertedId) {
      const [rows] = await db.execute(
        `
        SELECT r.id, r.asset_id, r.borrower_name, r.borrower_department, r.request_date, r.expected_return, r.reason, r.status,
               r.approved_by, r.approved_at, r.issued_at, r.return_date, r.return_condition, r.comment,
               a.asset_tag, a.name AS asset_name
        FROM borrowing_requests r
        LEFT JOIN assets a ON r.asset_id = a.id
        WHERE r.id = ?
        `,
        [insertedId]
      );
      if (rows && rows[0]) inserted = rows[0];
    }

    res.status(201).json({ success: true, data: { request: inserted } });
  } catch (err) {
    console.error('Create request error', err);
    res.status(400).json({ success: false, error: 'Failed to create request' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    await ensureRequestsTable();
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, error: 'Request id required' });
    const { status, comment } = req.body || {};
    if (!status) return res.status(400).json({ success: false, error: 'Status required' });
    const upper = status.toUpperCase();

    const updates = ['status = ?'];
    const params = [upper];

    if (upper === 'APPROVED') {
      updates.push('approved_by = ?', 'approved_at = NOW()');
      params.push(req.user && req.user.name ? req.user.name : 'Dept Head');
    } else if (upper === 'REJECTED') {
      updates.push('approved_by = ?', 'approved_at = NOW()');
      params.push(req.user && req.user.name ? req.user.name : 'Dept Head');
    } else if (upper === 'ISSUED') {
      updates.push('issued_at = NOW()');
    } else if (upper.startsWith('RETURNED')) {
      updates.push('return_date = NOW()');
    }

    if (comment !== undefined) {
      updates.push('comment = ?');
      params.push(comment);
    }

    params.push(id);
    const sql = `UPDATE borrowing_requests SET ${updates.join(', ')} WHERE id = ?`;
    await db.execute(sql, params);

    res.json({ success: true });
  } catch (err) {
    console.error('Update request status error', err);
    res.status(400).json({ success: false, error: 'Failed to update request' });
  }
};
