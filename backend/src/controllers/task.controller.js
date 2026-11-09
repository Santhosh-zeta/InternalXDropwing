const { pool } = require('../config/database');
const { logAudit } = require('../services/audit.service');
const {
  toId, taskWhere, getAccessibleProject, getAccessibleTask, canWriteTask,
} = require('../utils/scope');

const TASK_SELECT = `
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
  LEFT JOIN tasks pt ON t.parent_task_id = pt.id`;

const fail = (res, status, message) => res.status(status).json({ success: false, message });

/**
 * Every assignee must exist, be active, and belong to the task's venture (or be
 * a global user, or a client who is a member of the task's project). Returns
 * the cleaned id list, or null after sending the error response.
 */
const resolveAssignees = async (res, raw, ventureId, projectId) => {
  const ids = [...new Set((Array.isArray(raw) ? raw : [raw]).filter(Boolean).map(toId))];
  if (ids.length === 0 || ids.includes(null)) { fail(res, 400, 'Valid assignee ids are required'); return null; }
  const [users] = await pool.query(
    'SELECT id, access_level, venture_id FROM users WHERE id = ANY($1::int[]) AND is_active = TRUE',
    [ids]
  );
  if (users.length !== ids.length) { fail(res, 400, 'Unknown or inactive assignee'); return null; }
  let clientIds = new Set();
  if (projectId && users.some(u => u.access_level === 9)) {
    const [pm] = await pool.query('SELECT user_id FROM project_members WHERE project_id = $1', [projectId]);
    clientIds = new Set(pm.map(r => r.user_id));
  }
  const ok = users.every(u =>
    u.access_level <= 2 ||
    (u.access_level === 9 ? clientIds.has(u.id) : ventureId != null && u.venture_id === ventureId));
  if (!ok) { fail(res, 403, 'Assignees must belong to the task\'s venture'); return null; }
  return ids;
};

const getTasks = async (req, res) => {
  try {
    const params = [];
    const query = `${TASK_SELECT} WHERE ${taskWhere(req.scope, 't', params)} ORDER BY t.created_at DESC`;
    const [tasks] = await pool.query(query, params);
    return res.json({ success: true, data: tasks.map(t => ({ ...t, assignees: t.assignees || [] })) });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return fail(res, 500, 'Server error');
  }
};

const getTaskById = async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) return fail(res, 404, 'Task not found');
    const params = [id];
    const [tasks] = await pool.query(`${TASK_SELECT} WHERE t.id = $1 AND ${taskWhere(req.scope, 't', params)}`, params);
    if (tasks.length === 0) return fail(res, 404, 'Task not found');
    return res.json({ success: true, data: { ...tasks[0], assignees: tasks[0].assignees || [] } });
  } catch (error) {
    console.error('Error fetching task by ID:', error);
    return fail(res, 500, 'Server error');
  }
};

const createTask = async (req, res) => {
  try {
    const { title, description, assigned_to, due_date, priority, project_id, parent_task_id } = req.body;
    const { scope } = req;
    const assigned_by = scope.userId;

    if (!title || !assigned_to) return fail(res, 400, 'Title and Assignee are required');

    // Venture is derived from the project (must be visible to the caller) or the
    // caller; only global users may pick one, and only when no project decides it.
    let project = null;
    let taskVentureId = scope.global ? toId(req.body.venture_id) : scope.ventureId;
    if (project_id) {
      project = await getAccessibleProject(scope, project_id);
      if (!project) return fail(res, 404, 'Project not found');
      taskVentureId = project.venture_id;
    }
    if (parent_task_id) {
      const parent = await getAccessibleTask(scope, parent_task_id);
      if (!parent) return fail(res, 404, 'Parent task not found');
      if (taskVentureId == null) taskVentureId = parent.venture_id;
      else if (parent.venture_id !== taskVentureId) return fail(res, 400, 'Parent task is in another venture');
    }
    const rawAssignees = Array.isArray(assigned_to) ? assigned_to : [assigned_to];
    if (taskVentureId == null && scope.global) {
      const firstId = toId(rawAssignees[0]);
      if (firstId) {
        const [a] = await pool.query('SELECT venture_id FROM users WHERE id = $1', [firstId]);
        taskVentureId = a[0] ? a[0].venture_id : null;
      }
    }
    if (taskVentureId == null) return fail(res, 400, 'Cannot determine the venture for this task');

    const assignees = await resolveAssignees(res, rawAssignees, taskVentureId, project ? project.id : null);
    if (!assignees) return;

    const [result] = await pool.query(
      `INSERT INTO tasks (title, description, status, priority, assigned_to, assigned_by, venture_id, due_date, project_id, parent_task_id)
       VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [title, description || null, priority || 'medium', assignees[0], assigned_by, taskVentureId, due_date || null, project ? project.id : null, toId(parent_task_id)]
    );

    const taskId = result.insertId;

    if (taskId) {
      for (const uid of assignees) {
        await pool.query('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [taskId, uid]);
      }
    }

    await logAudit(req.user.id, 'CREATE_TASK', 'task', taskId, { title, assigned_to: assignees, project_id: project ? project.id : null, parent_task_id });

    // NOTIFICATIONS & EMAILS
    const { createNotification } = require('../services/notification.service');
    const { sendTaskAssignmentEmail } = require('../services/email.service');
    
    const projectName = project ? project.name : '';

    const allIds = [...new Set([...assignees, assigned_by])];
    const placeholders = allIds.map((_, i) => `$${i + 1}`).join(', ');
    const [usersData] = await pool.query(`SELECT id, email, full_name FROM users WHERE id IN (${placeholders})`, allIds);
    const assigner = usersData.find(u => u.id === assigned_by);
    const assignedByName = assigner ? assigner.full_name : 'An Administrator';

    for (const uid of assignees) {
      createNotification(
        uid, 
        'task_assigned', 
        'New Task Assigned', 
        `You have been assigned a new task: ${title}`,
        `/dashboard/tasks`
      ).catch(console.error);

      const assignee = usersData.find(u => u.id === uid);
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
    const { scope } = req;
    const task = await getAccessibleTask(scope, req.params.id);
    if (!task) return fail(res, 404, 'Task not found');
    if (!canWriteTask(scope, task)) return fail(res, 403, 'You can only edit tasks assigned to or created by you');
    const id = task.id;

    const { status, title, description, priority, due_date, project_id, parent_task_id, assigned_to } = req.body;

    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (title) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (priority) { updates.push('priority = ?'); params.push(priority); }
    if (due_date !== undefined) { updates.push('due_date = ?'); params.push(due_date); }

    // Moving a task: the target project / parent must be visible to the caller
    // and stay inside the task's venture.
    let projectId = task.project_id;
    if (project_id !== undefined) {
      if (project_id) {
        const project = await getAccessibleProject(scope, project_id);
        if (!project) return fail(res, 404, 'Project not found');
        if (task.venture_id != null && project.venture_id !== task.venture_id) return fail(res, 400, 'Project is in another venture');
        projectId = project.id;
      } else {
        projectId = null;
      }
      updates.push('project_id = ?'); params.push(projectId);
    }
    if (parent_task_id !== undefined) {
      if (parent_task_id) {
        const parent = await getAccessibleTask(scope, parent_task_id);
        if (!parent || parent.id === id) return fail(res, 404, 'Parent task not found');
        if (parent.venture_id !== task.venture_id) return fail(res, 400, 'Parent task is in another venture');
        updates.push('parent_task_id = ?'); params.push(parent.id);
      } else {
        updates.push('parent_task_id = ?'); params.push(null);
      }
    }

    let assignees = null;
    if (assigned_to !== undefined) {
      assignees = await resolveAssignees(res, assigned_to, task.venture_id, projectId);
      if (!assignees) return;
      updates.push('assigned_to = ?'); params.push(assignees[0]);
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    if (assignees !== null) {
      await pool.query('DELETE FROM task_assignees WHERE task_id = ?', [id]);
      for (const uid of assignees) {
        await pool.query('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, uid]);
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
    const task = await getAccessibleTask(req.scope, req.params.id);
    if (!task) return fail(res, 404, 'Task not found');
    if (!canWriteTask(req.scope, task)) return fail(res, 403, 'Not allowed to delete this task');
    await pool.query('DELETE FROM tasks WHERE id = ?', [task.id]);
    await logAudit(req.user.id, 'DELETE_TASK', 'task', task.id, { title: task.title });
    return res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return fail(res, 500, 'Server error');
  }
};

module.exports = { getTasks, getTaskById, createTask, updateTask, deleteTask };
