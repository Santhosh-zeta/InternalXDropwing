const { pool } = require('../config/database');

exports.getStrategyData = async (req, res) => {
  try {
    const accessLevel = req.user.accessLevel;
    const ventureId = req.user.ventureId;

    // L1-L2 see all; L3+ only see their venture
    const ventureFilter = (accessLevel <= 2) ? '' : ' WHERE o.venture_id = ?';
    const ventureParams = (accessLevel <= 2) ? [] : [ventureId];

    // Get OKRs with their key results
    const [okrs] = await pool.query(`
      SELECT o.*, v.name as venture_name, v.slug as venture_slug
      FROM okrs o
      LEFT JOIN ventures v ON o.venture_id = v.id
      ${ventureFilter}
      ORDER BY o.created_at DESC
    `, ventureParams);

    for (let okr of okrs) {
      const [kr] = await pool.query('SELECT * FROM key_results WHERE okr_id = ?', [okr.id]);
      okr.keyResults = kr.map(k => ({ text: k.title || k.text, done: !!k.is_done }));
    }

    // Get Risks (same scoping)
    const riskFilter = (accessLevel <= 2) ? '' : ' WHERE r.venture_id = ?';
    const [risks] = await pool.query(`
      SELECT r.*, v.name as venture_name
      FROM strategic_risks r
      LEFT JOIN ventures v ON r.venture_id = v.id
      ${riskFilter}
      ORDER BY r.severity DESC
    `, ventureParams);

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
