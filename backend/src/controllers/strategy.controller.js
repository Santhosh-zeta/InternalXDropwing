const { pool } = require('../config/database');

exports.getStrategyData = async (req, res) => {
  try {
    // Get OKRs with their key results
    const [okrs] = await pool.query(`
      SELECT o.*, v.name as venture_name, v.slug as venture_slug
      FROM okrs o
      LEFT JOIN ventures v ON o.venture_id = v.id
      ORDER BY o.created_at DESC
    `);

    for (let okr of okrs) {
      const [kr] = await pool.query('SELECT * FROM key_results WHERE okr_id = ?', [okr.id]);
      okr.keyResults = kr.map(k => ({ text: k.text, done: !!k.is_done }));
    }

    // Get Risks
    const [risks] = await pool.query(`
      SELECT r.*, v.name as venture_name
      FROM strategic_risks r
      LEFT JOIN ventures v ON r.venture_id = v.id
      ORDER BY r.severity DESC
    `);

    res.json({
      success: true,
      data: {
        okrs,
        risks
      }
    });
  } catch (error) {
    console.error('Error fetching strategy data:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
