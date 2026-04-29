const { pool } = require('../config/database');
const { logAudit } = require('../services/audit.service');

const getTasks = async (req, res) => {
  try {
    const { id: userId, accessLevel, ventureId } = req.user;
    
    let query = `
      SELECT t.*, 
        u1.full_name as assigned_to_name, u1.avatar_url as assigned_to_avatar,
        u2.full_name as assigned_by_name, u2.avatar_url as assigned_by_avatar,
        v.name as venture_name, v.primary_color,
        p.name as project_name,
        pt.title as parent_task_title
      FROM tasks t
      JOIN users u1 ON t.assigned_to = u1.id
      JOIN users u2 ON t.assigned_by = u2.id
      LEFT JOIN ventures v ON t.venture_id = v.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN tasks pt ON t.parent_task_id = pt.id
      WHERE 1=1
    `;
    const params = [];

    // Global admins (Level 1, 2) can see everything. 
    // Level 3-6 can see all tasks within their venture.
    // Level 7-9 can only see tasks assigned to them or by them.
    if (accessLevel >= 3 && accessLevel <= 6) {
      query += ` AND t.venture_id = ?`;
      params.push(ventureId);
    } else if (accessLevel >= 7) {
      query += ` AND (t.assigned_to = ? OR t.assigned_by = ?)`;
      params.push(userId, userId);
    }

    query += ` ORDER BY t.created_at DESC`;

    const [tasks] = await pool.query(query, params);
    
    return res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createTask = async (req, res) => {
  try {
    const { title, description, assigned_to, due_date, priority, project_id, parent_task_id } = req.body;
    const { id: assigned_by, ventureId } = req.user;

    if (!title || !assigned_to) {
      return res.status(400).json({ success: false, message: 'Title and Assignee are required' });
    }

    // Determine venture_id for the task. If global admin, maybe pass it in body, else use creator's venture
    const taskVentureId = req.user.accessLevel <= 2 ? (req.body.venture_id || null) : ventureId;

    const [result] = await pool.query(
      `INSERT INTO tasks (title, description, status, priority, assigned_to, assigned_by, venture_id, due_date, project_id, parent_task_id)
       VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`,
      [title, description || null, priority || 'medium', assigned_to, assigned_by, taskVentureId, due_date || null, project_id || null, parent_task_id || null]
    );

    await logAudit(req.user.id, 'CREATE_TASK', 'task', result.insertId, { title, assigned_to, project_id, parent_task_id });

    // FETCH USER DETAILS FOR EMAIL
    try {
      const [usersData] = await pool.query('SELECT id, email, full_name FROM users WHERE id IN (?, ?)', [assigned_to, assigned_by]);
      
      const assignee = usersData.find(u => u.id === parseInt(assigned_to));
      const assigner = usersData.find(u => u.id === parseInt(assigned_by));

      if (assignee) {
        const assignedByName = assigner ? assigner.full_name : 'An Administrator';
        
        let projectName = '';
        if (project_id) {
          const [projData] = await pool.query('SELECT name FROM projects WHERE id = ?', [project_id]);
          if (projData.length > 0) projectName = projData[0].name;
        }

        const { sendTaskAssignmentEmail } = require('../services/email.service');
        // Do not await to avoid blocking the API response
        sendTaskAssignmentEmail(assignee.email, assignee.full_name, title, assignedByName, projectName).catch(console.error);
      }
    } catch (emailErr) {
      console.error('Error triggering assignment email:', emailErr);
    }

    return res.status(201).json({ success: true, message: 'Task created', data: { id: result.insertId } });
  } catch (error) {
    console.error('Error creating task:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, title, description, priority, due_date, project_id, parent_task_id } = req.body;
    
    // Build dynamic update
    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (title) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (priority) { updates.push('priority = ?'); params.push(priority); }
    if (due_date !== undefined) { updates.push('due_date = ?'); params.push(due_date); }
    if (project_id !== undefined) { updates.push('project_id = ?'); params.push(project_id); }
    if (parent_task_id !== undefined) { updates.push('parent_task_id = ?'); params.push(parent_task_id); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    params.push(id);
    
    const [result] = await pool.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await logAudit(req.user.id, 'UPDATE_TASK', 'task', id, { targetId: id, changedFields: updates });

    return res.json({ success: true, message: 'Task updated' });
  } catch (error) {
    console.error('Error updating task:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    
    return res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getTasks, createTask, updateTask, deleteTask };
