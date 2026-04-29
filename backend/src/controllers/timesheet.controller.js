const { pool } = require('../config/database');

exports.logHours = async (req, res, next) => {
  try {
    const { taskId, projectId, ventureId, hours, activityDate, notes } = req.body;

    // Basic validation
    if (!hours || hours <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid hours logged' });
    }

    const query = `
      INSERT INTO timesheets (user_id, task_id, project_id, venture_id, hours, activity_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [req.user.id, taskId || null, projectId || null, ventureId || req.user.ventureId || null, hours, activityDate, notes || ''];

    const [result] = await pool.query(query, values);
    const [inserted] = await pool.query('SELECT * FROM timesheets WHERE id = ?', [result.insertId]);

    res.status(201).json({ success: true, data: inserted[0] });
  } catch (err) {
    next(err);
  }
};

exports.getTimesheets = async (req, res, next) => {
  try {
    const userLevel = req.user.accessLevel;
    let query = `
      SELECT t.*, 
             u.full_name as user_name, u.access_level,
             p.name as project_name,
             ts.title as task_title,
             v.name as venture_name, v.primary_color as venture_color
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN tasks ts ON t.task_id = ts.id
      LEFT JOIN ventures v ON t.venture_id = v.id
      WHERE 1=1
    `;
    const values = [];

    // Filter logic
    if (userLevel >= 6) {
      // Lower level staff only see their own
      query += ` AND t.user_id = ?`;
      values.push(req.user.id);
    } else if (userLevel === 4 || userLevel === 5) {
      // Managers see their venture's timesheets
      if (req.user.ventureId) {
        query += ` AND t.venture_id = ?`;
        values.push(req.user.ventureId);
      }
    }
    // Levels 1-3 see everything

    query += ` ORDER BY t.activity_date DESC, t.created_at DESC`;

    const [timesheets] = await pool.query(query, values);

    // Calculate simulated rate based on access level: (10 - level) * $15
    const enriched = timesheets.map(t => {
      const rate = (10 - (t.access_level || 9)) * 15;
      return {
        ...t,
        hourly_rate: rate,
        total_cost: parseFloat(t.hours) * rate
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (req.user.accessLevel >= 6) {
      return res.status(403).json({ success: false, message: 'Not authorized to approve timesheets' });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    await pool.query('UPDATE timesheets SET status = ?, approved_by = ? WHERE id = ?', [status, req.user.id, id]);

    res.json({ success: true, message: `Timesheet ${status}` });
  } catch (err) {
    next(err);
  }
};

exports.getFinancials = async (req, res, next) => {
  try {
    if (req.user.accessLevel >= 6) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Get aggregated data: total hours and simulated cost per venture
    const [stats] = await pool.query(`
      SELECT t.venture_id, v.name as venture_name, 
             SUM(t.hours) as total_hours,
             u.access_level
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN ventures v ON t.venture_id = v.id
      WHERE t.status = 'approved'
      GROUP BY t.venture_id, v.name, u.access_level
    `);

    // Calculate costs
    const ventureStats = {};
    let globalTotalCost = 0;
    let globalTotalHours = 0;

    stats.forEach(row => {
      const vid = row.venture_id || 'global';
      const vname = row.venture_name || 'Global Operations';
      if (!ventureStats[vid]) {
        ventureStats[vid] = { name: vname, hours: 0, cost: 0 };
      }
      
      const rate = (10 - (row.access_level || 9)) * 15;
      const hours = parseFloat(row.total_hours);
      const cost = hours * rate;

      ventureStats[vid].hours += hours;
      ventureStats[vid].cost += cost;
      
      globalTotalCost += cost;
      globalTotalHours += hours;
    });

    res.json({
      success: true,
      data: {
        byVenture: Object.values(ventureStats),
        global: {
          totalHours: globalTotalHours,
          totalCost: globalTotalCost
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
