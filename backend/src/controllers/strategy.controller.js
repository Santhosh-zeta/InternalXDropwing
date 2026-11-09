const { pool } = require('../config/database');
const { ventureWhere } = require('../utils/scope');

/**
 * OKRs and risks. Internal staff only; global users see every venture, everyone
 * else only their own venture's rows. Clients get 403.
 */
exports.getStrategyData = async (req, res) => {
  try {
    const { scope } = req;
    if (scope.isClient) return res.status(403).json({ success: false, message: 'Not available for client accounts' });

    const okrParams = [];
    const [okrs] = await pool.query(`
      SELECT o.*, v.name as venture_name, v.slug as venture_slug
      FROM okrs o
      LEFT JOIN ventures v ON o.venture_id = v.id
      WHERE ${ventureWhere(scope, 'o.venture_id', okrParams)}
      ORDER BY o.created_at DESC
    `, okrParams);

    if (okrs.length) {
      const [krs] = await pool.query('SELECT * FROM key_results WHERE okr_id = ANY($1::int[]) ORDER BY id', [okrs.map(o => o.id)]);
      for (const okr of okrs) {
        okr.keyResults = krs.filter(k => k.okr_id === okr.id).map(k => ({ text: k.title || k.text, done: !!k.is_done }));
      }
    }

    const riskParams = [];
    const [risks] = await pool.query(`
      SELECT r.*, v.name as venture_name
      FROM strategic_risks r
      LEFT JOIN ventures v ON r.venture_id = v.id
      WHERE ${ventureWhere(scope, 'r.venture_id', riskParams)}
      ORDER BY r.severity DESC
    `, riskParams);

    res.json({ success: true, data: { okrs, risks } });
  } catch (error) {
    console.error('Error fetching strategy data:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
