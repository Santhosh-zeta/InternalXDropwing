const { pool } = require('../config/database');

exports.getInvoices = async (req, res, next) => {
  try {
    const userLevel = req.user.accessLevel;
    let ventureFilter = '';
    const values = [];

    // For clients (Level 9), only show invoices for their venture
    if (userLevel === 9) {
      if (!req.user.ventureId) {
        return res.json({ success: true, data: [] });
      }
      ventureFilter = 'AND t.venture_id = ?';
      values.push(req.user.ventureId);
    } else if (userLevel > 3 && userLevel !== 9) {
       // Managers see their venture's invoices
       if (req.user.ventureId) {
          ventureFilter = 'AND t.venture_id = ?';
          values.push(req.user.ventureId);
       }
    }

    // Group approved timesheets by venture and month
    const query = `
      SELECT 
        t.venture_id,
        v.name as venture_name,
        DATE_FORMAT(t.activity_date, '%Y-%m') as invoice_month,
        SUM(t.hours) as total_hours,
        COUNT(t.id) as timesheet_count
      FROM timesheets t
      JOIN ventures v ON t.venture_id = v.id
      WHERE t.status = 'approved' ${ventureFilter}
      GROUP BY t.venture_id, v.name, invoice_month
      ORDER BY invoice_month DESC
    `;

    const [results] = await pool.query(query, values);

    const invoices = results.map(row => {
      const BILLING_RATE = 150; // Standard $150/hr billing rate
      const totalAmount = parseFloat(row.total_hours) * BILLING_RATE;
      
      return {
        id: `INV-${row.venture_id}-${row.invoice_month}`,
        invoice_number: `INV-${row.venture_id}-${row.invoice_month.replace('-', '')}`,
        venture_id: row.venture_id,
        venture_name: row.venture_name,
        month: row.invoice_month,
        total_hours: parseFloat(row.total_hours),
        total_amount: totalAmount,
        status: 'Unpaid', // Default status for demo
        issue_date: `${row.invoice_month}-28`, // Example issue date
      };
    });

    res.json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
};

exports.getInvoiceDetails = async (req, res, next) => {
  try {
    const { id } = req.params; // format: INV-ventureId-YYYY-MM
    const parts = id.split('-');
    if (parts.length !== 4) return res.status(400).json({ success: false, message: 'Invalid invoice ID format' });

    const ventureId = parseInt(parts[1]);
    const month = `${parts[2]}-${parts[3]}`; // YYYY-MM

    if (req.user.accessLevel === 9 && req.user.ventureId !== ventureId) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this invoice' });
    }

    const query = `
      SELECT t.*, 
             u.full_name as user_name,
             p.name as project_name,
             ts.title as task_title
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN tasks ts ON t.task_id = ts.id
      WHERE t.status = 'approved' AND t.venture_id = ? AND DATE_FORMAT(t.activity_date, '%Y-%m') = ?
      ORDER BY t.activity_date ASC
    `;

    const [timesheets] = await pool.query(query, [ventureId, month]);

    const BILLING_RATE = 150; 
    let totalHours = 0;
    
    const items = timesheets.map(t => {
      const hours = parseFloat(t.hours);
      totalHours += hours;
      return {
        id: t.id,
        date: t.activity_date,
        developer: t.user_name,
        project: t.project_name || 'General Deliverables',
        task: t.task_title || t.notes,
        hours: hours,
        amount: hours * BILLING_RATE
      };
    });

    // Fetch venture details for the header
    const [venture] = await pool.query('SELECT name, logo_url, primary_color FROM ventures WHERE id = ?', [ventureId]);
    const ventureName = venture.length ? venture[0].name : 'Unknown Venture';

    res.json({ 
      success: true, 
      data: {
        id,
        invoice_number: `INV-${ventureId}-${month.replace('-', '')}`,
        month,
        venture_name: ventureName,
        items,
        total_hours: totalHours,
        total_amount: totalHours * BILLING_RATE,
        billing_rate: BILLING_RATE,
        issue_date: `${month}-28`,
        due_date: new Date(new Date(`${month}-28`).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    });
  } catch (err) {
    next(err);
  }
};
