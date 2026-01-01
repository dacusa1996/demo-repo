const db = require('../db');

exports.stats = async (_req, res) => {
  try {
    const [[assetCounts]] = await db.query(`
      SELECT
        COUNT(*) AS totalAssets,
        SUM(CASE WHEN LOWER(status) = 'available' THEN 1 ELSE 0 END) AS availableAssets,
        SUM(CASE WHEN LOWER(status) IN ('borrowed','checked_out') THEN 1 ELSE 0 END) AS borrowedAssets,
        SUM(CASE WHEN LOWER(status) IN ('maintenance','under_maintenance') THEN 1 ELSE 0 END) AS underMaintenance
      FROM assets
    `);

    const [[overdue]] = await db.query(
      `
        SELECT COUNT(*) AS overdueReturns
        FROM borrowing_requests
        WHERE status IN ('ISSUED','BORROWED','APPROVED')
          AND expected_return IS NOT NULL
          AND expected_return < CURDATE()
          AND return_date IS NULL
      `
    );

    res.json({
      success: true,
      data: {
        totalAssets: assetCounts.totalAssets || 0,
        availableAssets: assetCounts.availableAssets || 0,
        borrowedAssets: assetCounts.borrowedAssets || 0,
        underMaintenance: assetCounts.underMaintenance || 0,
        overdueReturns: (overdue && overdue.overdueReturns) || 0
      }
    });
  } catch (err) {
    console.error('dashboard stats error', err);
    res.status(500).json({ success: false, error: 'Failed to load stats' });
  }
};

exports.recent = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const [rows] = await db.query(
      `
        SELECT * FROM (
          SELECT
            COALESCE(r.return_date, r.issued_at, r.approved_at, r.request_date, NOW()) AS event_time,
            DATE_FORMAT(COALESCE(r.return_date, r.issued_at, r.approved_at, r.request_date, NOW()), '%Y-%m-%d %H:%i') AS date,
            CASE
              WHEN r.status LIKE 'RETURNED%' THEN 'Asset Returned'
              WHEN r.status = 'ISSUED' THEN 'Asset Borrowed'
              WHEN r.status = 'APPROVED' THEN 'Request Approved'
              ELSE 'Request Created'
            END AS action,
            a.asset_tag AS asset,
            r.borrower_name AS user
          FROM borrowing_requests r
          LEFT JOIN assets a ON r.asset_id = a.id
          WHERE COALESCE(r.return_date, r.issued_at, r.approved_at, r.request_date) IS NOT NULL

          UNION ALL

          SELECT
            a.created_at AS event_time,
            DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i') AS date,
            CONCAT('Asset Added: ', a.name) AS action,
            a.asset_tag AS asset,
            'System' AS user
          FROM assets a
        ) recent
        ORDER BY event_time DESC
        LIMIT ?
      `,
      [limit]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('dashboard recent error', err);
    res.status(500).json({ success: false, error: 'Failed to load activity' });
  }
};
