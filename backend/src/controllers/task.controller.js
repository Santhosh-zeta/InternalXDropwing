const { pool } = require('../config/database');
const { logAudit } = require('../services/audit.service');

const getTasks = async (req, res) => {
  try {
    const { id: userId, accessLevel, ventureId } = req.user;
    
    let query = `
      SELECT t.*, 
        u2.full_name as assigned_by_name, u2.avatar_url as assigned_by_avatar,
        v.name as venture_name, v.primary_color,
        p.name as project_name,
        pt.title as parent_task_title,
        (
          SELECT json_agg(json_build_object('id', u.id, 'name', u.full_name, 'avatar', u.avatar_url))
          FROM task_assignees ta
          JOIN users u ON ta.user_id = u.id
          WHERE ta.task_id = t.id
        ) as assignees
      FROM tasks t
      JOIN users u2 ON t.assigned_by = u2.id
      LEFT JOIN ventures v ON t.venture_id = v.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN tasks pt ON t.parent_task_id = pt.id
      WHERE 1=1
    `;
    const params = [];

    if (accessLevel >= 3 && accessLevel <= 6) {
      query += ` AND (t.venture_id = ? OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ?))`;
      params.push(ventureId, userId);
    } else if (accessLevel >= 7) {
      query += ` AND (EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ?) OR t.assigned_by = ?)`;
      params.push(userId, userId);
    }

    query += ` ORDER BY t.created_at DESC`;

    const [tasks] = await pool.query(query, params);
    
    // Fallback if assignees is null due to empty JSON agg
    const processedTasks = tasks.map(t => ({
      ...t,
      assignees: t.assignees || []
    }));
    
    return res.json({ success: true, data: processedTasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getTaskById = async (req, res) => {
  try {
    const { id: userId, accessLevel, ventureId } = req.user;
    const { id } = req.params;

    let query = `
      SELECT t.*, 
        u2.full_name as assigned_by_name, u2.avatar_url as assigned_by_avatar,
        v.name as venture_name, v.primary_color,
        p.name as project_name,
        pt.title as parent_task_title,
        (
          SELECT json_agg(json_build_object('id', u.id, 'name', u.full_name, 'avatar', u.avatar_url))
          FROM task_assignees ta
          JOIN users u ON ta.user_id = u.id
          WHERE ta.task_id = t.id
        ) as assignees
      FROM tasks t
      JOIN users u2 ON t.assigned_by = u2.id
      LEFT JOIN ventures v ON t.venture_id = v.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN tasks pt ON t.parent_task_id = pt.id
      WHERE t.id = ?
    `;
    const params = [id];

    if (accessLevel >= 3 && accessLevel <= 6) {
      query += ` AND (t.venture_id = ? OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ?))`;
      params.push(ventureId, userId);
    } else if (accessLevel >= 7) {
      query += ` AND (EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ?) OR t.assigned_by = ?)`;
      params.push(userId, userId);
    }

    const [tasks] = await pool.query(query, params);
    
    if (tasks.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const task = {
      ...tasks[0],
      assignees: tasks[0].assignees || []
    };
    
    return res.json({ success: true, data: task });
  } catch (error) {
    console.error('Error fetching task by ID:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createTask = async (req, res) => {
  try {
    const { title, description, assigned_to, due_date, priority, project_id, parent_task_id } = req.body;
    const { id: assigned_by, ventureId } = req.user;

    const assignees = Array.isArray(assigned_to) ? assigned_to : [assigned_to];

    if (!title || assignees.length === 0 || !assignees[0]) {
      return res.status(400).json({ success: false, message: 'Title and Assignee are required' });
    }

    let taskVentureId = req.user.accessLevel <= 2 ? (req.body.venture_id || null) : ventureId;

    // If no venture_id resolved, look up from first assignee
    if (!taskVentureId && assignees[0]) {
      const [assigneeData] = await pool.query('SELECT venture_id FROM users WHERE id = ?', [assignees[0]]);
      if (assigneeData.length > 0 && assigneeData[0].venture_id) {
        taskVentureId = assigneeData[0].venture_id;
      }
    }

    const [result] = await pool.query(
      `INSERT INTO tasks (title, description, status, priority, assigned_to, assigned_by, venture_id, due_date, project_id, parent_task_id)
       VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [title, description || null, priority || 'medium', assignees[0], assigned_by, taskVentureId, due_date || null, project_id || null, parent_task_id || null]
    );

    const taskId = result.insertId || (result.rows && result.rows[0] ? result.rows[0].id : null);

    if (taskId) {
      for (let uid of assignees) {
        if (uid) {
          await pool.query('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [taskId, uid]);
        }
      }
    }

    await logAudit(req.user.id, 'CREATE_TASK', 'task', taskId, { title, assigned_to: assignees, project_id, parent_task_id });

    // NOTIFICATIONS & EMAILS
    const { createNotification } = require('../services/notification.service');
    const { sendTaskAssignmentEmail } = require('../services/email.service');
    
    let projectName = '';
    if (project_id) {
      const [projData] = await pool.query('SELECT name FROM projects WHERE id = ?', [project_id]);
      if (projData.length > 0) projectName = projData[0].name;
    }

    const assigneeIds = assignees.filter(Boolean).map(id => parseInt(id));
    const allIds = [...new Set([...assigneeIds, parseInt(assigned_by)])];
    const placeholders = allIds.map((_, i) => `$${i + 1}`).join(', ');
    const [usersData] = await pool.query(`SELECT id, email, full_name FROM users WHERE id IN (${placeholders})`, allIds);
    const assigner = usersData.find(u => u.id === parseInt(assigned_by));
    const assignedByName = assigner ? assigner.full_name : 'An Administrator';

    for (let uid of assignees) {
      if (!uid) continue;
      createNotification(
        uid, 
        'task_assigned', 
        'New Task Assigned', 
        `You have been assigned a new task: ${title}`,
        `/dashboard/tasks`
      ).catch(console.error);

      const assignee = usersData.find(u => u.id === parseInt(uid));
      if (assignee) {
        sendTaskAssignmentEmail(assignee.email, assignee.full_name, title, assignedByName, projectName).catch(console.error);
      }
    }

    return res.status(201).json({ success: true, message: 'Task created', data: { id: taskId } });
  } catch (error) {
    console.error('Error creating task:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, title, description, priority, due_date, project_id, parent_task_id, assigned_to } = req.body;
    
    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (title) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (priority) { updates.push('priority = ?'); params.push(priority); }
    if (due_date !== undefined) { updates.push('due_date = ?'); params.push(due_date); }
    if (project_id !== undefined) { updates.push('project_id = ?'); params.push(project_id); }
    if (parent_task_id !== undefined) { updates.push('parent_task_id = ?'); params.push(parent_task_id); }

    let assignees = null;
    if (assigned_to !== undefined) {
      assignees = Array.isArray(assigned_to) ? assigned_to : [assigned_to];
      if (assignees.length > 0 && assignees[0]) {
        updates.push('assigned_to = ?'); params.push(assignees[0]);
      }
    }

    if (updates.length > 0) {
      params.push(id);
      const [result] = await pool.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);
      if (result.affectedRows === 0 && updates.length > 0) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
    }

    if (assignees !== null) {
      await pool.query('DELETE FROM task_assignees WHERE task_id = ?', [id]);
      for (let uid of assignees) {
        if (uid) {
          await pool.query('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, uid]);
        }
      }
    }

    await logAudit(req.user.id, 'UPDATE_TASK', 'task', id, { targetId: id, changedFields: updates });

    // IF STATUS CHANGED, NOTIFY ASSIGNEES
    if (status) {
      try {
        const [[taskData]] = await pool.query('SELECT title FROM tasks WHERE id = ?', [id]);
        const [assigneesData] = await pool.query('SELECT user_id FROM task_assignees WHERE task_id = ?', [id]);
        if (taskData) {
          const { createNotification } = require('../services/notification.service');
          for (let a of assigneesData) {
            createNotification(
              a.user_id,
              'task_updated',
              'Task Status Updated',
              `Task "${taskData.title}" is now ${status}`,
              `/dashboard/tasks`
            ).catch(console.error);
          }
        }
      } catch (e) { console.error('Notify fail:', e); }
    }

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

module.exports = { getTasks, getTaskById, createTask, updateTask, deleteTask };
