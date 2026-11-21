const { pool } = require('../config/database');
const { logAudit } = require('../services/audit.service');
const { toId, getAccessibleProject, getAccessibleTask, canWriteTask } = require('../utils/scope');

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// Helper to determine venture and project scope
async function resolveProjectAndVenture(scope, projectId) {
  const pId = toId(projectId);
  if (!pId) return null;
  const project = await getAccessibleProject(scope, pId);
  if (!project) return null;
  return { project, ventureId: project.venture_id };
}

// Generate an issue key like FEN-42 based on project
async function generateNextKey(projectId, prefix = 'FEN') {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*)::int as count FROM tasks WHERE project_id = ?`,
      [projectId]
    );
    const count = (rows[0] ? rows[0].count : 0) + 1;
    return `${prefix}-${count}`;
  } catch {
    return `${prefix}-${Date.now().toString().slice(-4)}`;
  }
}

// ==========================================
// 1. EPICS & PRODUCT REQUIREMENTS (PRD)
// ==========================================

const getEpics = async (req, res) => {
  try {
    const { scope } = req;
    const projectId = toId(req.query.project_id);
    const params = [];
    let sql = `
      SELECT e.*, 
        p.name as project_name, v.name as venture_name,
        u.full_name as owner_name, u.avatar_url as owner_avatar,
        COUNT(t.id)::int as total_issues,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::int as completed_issues,
        COALESCE(SUM(t.story_points), 0)::int as total_points,
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.story_points ELSE 0 END), 0)::int as completed_points
      FROM software_epics e
      JOIN projects p ON e.project_id = p.id
      JOIN ventures v ON e.venture_id = v.id
      LEFT JOIN users u ON e.owner_id = u.id
      LEFT JOIN tasks t ON t.epic_id = e.id
    `;

    if (projectId) {
      const proj = await getAccessibleProject(scope, projectId);
      if (!proj) return fail(res, 404, 'Project not found');
      sql += ` WHERE e.project_id = ?`;
      params.push(projectId);
    } else if (!scope.global) {
      sql += ` WHERE e.venture_id = ?`;
      params.push(scope.ventureId);
    }

    sql += ` GROUP BY e.id, p.name, v.name, u.full_name, u.avatar_url ORDER BY e.created_at DESC`;
    const [epics] = await pool.query(sql, params);
    return res.json({ success: true, data: epics });
  } catch (error) {
    console.error('getEpics error:', error);
    return fail(res, 500, 'Failed to fetch epics');
  }
};

const createEpic = async (req, res) => {
  try {
    const { scope } = req;
    const { project_id, title, summary, prd_content, priority = 'medium', key } = req.body;
    if (!project_id || !title) return fail(res, 400, 'Project ID and Title are required');

    const resolved = await resolveProjectAndVenture(scope, project_id);
    if (!resolved) return fail(res, 404, 'Project not found or accessible');

    const epicKey = key || `FEN-E${Date.now().toString().slice(-4)}`;
    const [result] = await pool.query(
      `INSERT INTO software_epics (project_id, venture_id, key, title, summary, prd_content, priority, owner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [project_id, resolved.ventureId, epicKey, title, summary || null, prd_content || null, priority, scope.userId]
    );

    const id = result.insertId;
    await logAudit(scope.userId, 'CREATE_EPIC', 'software_epic', id, { title, key: epicKey, project_id });
    return res.status(201).json({ success: true, data: { id, key: epicKey, title } });
  } catch (error) {
    console.error('createEpic error:', error);
    return fail(res, 500, 'Failed to create epic');
  }
};

const updateEpic = async (req, res) => {
  try {
    const { scope } = req;
    const id = toId(req.params.id);
    if (!id) return fail(res, 404, 'Epic not found');

    const [existing] = await pool.query(`SELECT * FROM software_epics WHERE id = ?`, [id]);
    if (!existing.length) return fail(res, 404, 'Epic not found');
    const epic = existing[0];

    const proj = await getAccessibleProject(scope, epic.project_id);
    if (!proj) return fail(res, 403, 'Permission denied');

    const { title, summary, prd_content, status, priority } = req.body;
    const updates = [];
    const params = [];

    if (title) { updates.push('title = ?'); params.push(title); }
    if (summary !== undefined) { updates.push('summary = ?'); params.push(summary); }
    if (prd_content !== undefined) { updates.push('prd_content = ?'); params.push(prd_content); }
    if (status) { updates.push('status = ?'); params.push(status); }
    if (priority) { updates.push('priority = ?'); params.push(priority); }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE software_epics SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
    }

    return res.json({ success: true, message: 'Epic updated' });
  } catch (error) {
    console.error('updateEpic error:', error);
    return fail(res, 500, 'Failed to update epic');
  }
};

const deleteEpic = async (req, res) => {
  try {
    const { scope } = req;
    const id = toId(req.params.id);
    const [existing] = await pool.query(`SELECT * FROM software_epics WHERE id = ?`, [id]);
    if (!existing.length) return fail(res, 404, 'Epic not found');
    const epic = existing[0];

    const proj = await getAccessibleProject(scope, epic.project_id);
    if (!proj || scope.accessLevel > 5) return fail(res, 403, 'Permission denied');

    await pool.query(`DELETE FROM software_epics WHERE id = ?`, [id]);
    return res.json({ success: true, message: 'Epic deleted' });
  } catch (error) {
    console.error('deleteEpic error:', error);
    return fail(res, 500, 'Failed to delete epic');
  }
};

// ==========================================
// 2. SPRINTS & RETROSPECTIVES
// ==========================================

const getSprints = async (req, res) => {
  try {
    const { scope } = req;
    const projectId = toId(req.query.project_id);
    const params = [];
    let sql = `
      SELECT s.*, 
        p.name as project_name,
        COUNT(t.id)::int as total_issues,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::int as completed_issues,
        COALESCE(SUM(t.story_points), 0)::int as total_points,
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.story_points ELSE 0 END), 0)::int as completed_points
      FROM sprints s
      JOIN projects p ON s.project_id = p.id
    `;

    if (projectId) {
      const proj = await getAccessibleProject(scope, projectId);
      if (!proj) return fail(res, 404, 'Project not found');
      sql += ` WHERE s.project_id = ?`;
      params.push(projectId);
    } else if (!scope.global) {
      sql += ` WHERE s.venture_id = ?`;
      params.push(scope.ventureId);
    }

    sql += ` GROUP BY s.id, p.name ORDER BY s.created_at DESC`;
    const [sprints] = await pool.query(sql, params);
    return res.json({ success: true, data: sprints });
  } catch (error) {
    console.error('getSprints error:', error);
    return fail(res, 500, 'Failed to fetch sprints');
  }
};

const createSprint = async (req, res) => {
  try {
    const { scope } = req;
    const { project_id, name, goal, start_date, end_date } = req.body;
    if (!project_id || !name) return fail(res, 400, 'Project ID and Sprint Name are required');

    const resolved = await resolveProjectAndVenture(scope, project_id);
    if (!resolved) return fail(res, 404, 'Project not found or accessible');

    const [result] = await pool.query(
      `INSERT INTO sprints (project_id, venture_id, name, goal, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?, ?, 'planned') RETURNING id`,
      [project_id, resolved.ventureId, name, goal || null, start_date || null, end_date || null]
    );

    const id = result.insertId;
    await logAudit(scope.userId, 'CREATE_SPRINT', 'sprint', id, { name, project_id });
    return res.status(201).json({ success: true, data: { id, name } });
  } catch (error) {
    console.error('createSprint error:', error);
    return fail(res, 500, 'Failed to create sprint');
  }
};

const updateSprint = async (req, res) => {
  try {
    const { scope } = req;
    const id = toId(req.params.id);
    const [existing] = await pool.query(`SELECT * FROM sprints WHERE id = ?`, [id]);
    if (!existing.length) return fail(res, 404, 'Sprint not found');
    const sprint = existing[0];

    const proj = await getAccessibleProject(scope, sprint.project_id);
    if (!proj) return fail(res, 403, 'Permission denied');

    const { name, goal, status, start_date, end_date } = req.body;
    const updates = [];
    const params = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (goal !== undefined) { updates.push('goal = ?'); params.push(goal); }
    if (status) { updates.push('status = ?'); params.push(status); }
    if (start_date !== undefined) { updates.push('start_date = ?'); params.push(start_date || null); }
    if (end_date !== undefined) { updates.push('end_date = ?'); params.push(end_date || null); }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE sprints SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
    }

    return res.json({ success: true, message: 'Sprint updated' });
  } catch (error) {
    console.error('updateSprint error:', error);
    return fail(res, 500, 'Failed to update sprint');
  }
};

const getSprintRetros = async (req, res) => {
  try {
    const sprintId = toId(req.params.id);
    const [notes] = await pool.query(
      `SELECT n.*, u.full_name as author_name, u.avatar_url as author_avatar
       FROM sprint_notes n
       JOIN users u ON n.author_id = u.id
       WHERE n.sprint_id = ?
       ORDER BY n.created_at ASC`,
      [sprintId]
    );
    return res.json({ success: true, data: notes });
  } catch (error) {
    console.error('getSprintRetros error:', error);
    return fail(res, 500, 'Failed to fetch retrospective notes');
  }
};

const createSprintRetro = async (req, res) => {
  try {
    const { scope } = req;
    const sprintId = toId(req.params.id);
    const { category, content } = req.body;
    if (!content) return fail(res, 400, 'Content is required');

    const [result] = await pool.query(
      `INSERT INTO sprint_notes (sprint_id, author_id, category, content)
       VALUES (?, ?, ?, ?) RETURNING id`,
      [sprintId, scope.userId, category || 'went_well', content]
    );

    return res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error('createSprintRetro error:', error);
    return fail(res, 500, 'Failed to create retrospective note');
  }
};

// ==========================================
// 3. SOFTWARE RELEASES / VERSIONS
// ==========================================

const getReleases = async (req, res) => {
  try {
    const { scope } = req;
    const projectId = toId(req.query.project_id);
    const params = [];
    let sql = `
      SELECT r.*,
        p.name as project_name,
        COUNT(t.id)::int as total_issues,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::int as completed_issues
      FROM software_releases r
      JOIN projects p ON r.project_id = p.id
    `;

    if (projectId) {
      const proj = await getAccessibleProject(scope, projectId);
      if (!proj) return fail(res, 404, 'Project not found');
      sql += ` WHERE r.project_id = ?`;
      params.push(projectId);
    } else if (!scope.global) {
      sql += ` WHERE r.venture_id = ?`;
      params.push(scope.ventureId);
    }

    sql += ` GROUP BY r.id, p.name ORDER BY r.release_date DESC NULLS LAST, r.created_at DESC`;
    const [releases] = await pool.query(sql, params);
    return res.json({ success: true, data: releases });
  } catch (error) {
    console.error('getReleases error:', error);
    return fail(res, 500, 'Failed to fetch releases');
  }
};

const createRelease = async (req, res) => {
  try {
    const { scope } = req;
    const { project_id, version_name, description, release_date, release_notes } = req.body;
    if (!project_id || !version_name) return fail(res, 400, 'Project ID and Version Name are required');

    const resolved = await resolveProjectAndVenture(scope, project_id);
    if (!resolved) return fail(res, 404, 'Project not found');

    const [result] = await pool.query(
      `INSERT INTO software_releases (project_id, venture_id, version_name, description, release_date, release_notes, status)
       VALUES (?, ?, ?, ?, ?, ?, 'unreleased') RETURNING id`,
      [project_id, resolved.ventureId, version_name, description || null, release_date || null, release_notes || null]
    );

    return res.status(201).json({ success: true, data: { id: result.insertId, version_name } });
  } catch (error) {
    console.error('createRelease error:', error);
    return fail(res, 500, 'Failed to create release');
  }
};

const updateRelease = async (req, res) => {
  try {
    const { scope } = req;
    const id = toId(req.params.id);
    const [existing] = await pool.query(`SELECT * FROM software_releases WHERE id = ?`, [id]);
    if (!existing.length) return fail(res, 404, 'Release not found');
    const rel = existing[0];

    const proj = await getAccessibleProject(scope, rel.project_id);
    if (!proj) return fail(res, 403, 'Permission denied');

    const { version_name, description, status, release_date, release_notes } = req.body;
    const updates = [];
    const params = [];

    if (version_name) { updates.push('version_name = ?'); params.push(version_name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (status) { updates.push('status = ?'); params.push(status); }
    if (release_date !== undefined) { updates.push('release_date = ?'); params.push(release_date || null); }
    if (release_notes !== undefined) { updates.push('release_notes = ?'); params.push(release_notes || null); }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE software_releases SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    return res.json({ success: true, message: 'Release updated' });
  } catch (error) {
    console.error('updateRelease error:', error);
    return fail(res, 500, 'Failed to update release');
  }
};

// ==========================================
// 4. SOFTWARE ISSUES / USER STORIES / BUGS
// ==========================================

const getSoftwareIssues = async (req, res) => {
  try {
    const { scope } = req;
    const { project_id, sprint_id, epic_id, issue_type, status, release_id } = req.query;

    const params = [];
    let sql = `
      SELECT t.*,
        u.full_name as assigned_to_name, u.avatar_url as assigned_to_avatar,
        s.name as sprint_name, s.status as sprint_status,
        e.title as epic_title, e.key as epic_key,
        r.version_name as release_version,
        p.name as project_name,
        (
          SELECT json_agg(json_build_object('id', u2.id, 'name', u2.full_name, 'avatar', u2.avatar_url))
          FROM task_assignees ta
          JOIN users u2 ON ta.user_id = u2.id
          WHERE ta.task_id = t.id
        ) as assignees,
        (SELECT COUNT(*)::int FROM task_comments tc WHERE tc.task_id = t.id) as comment_count,
        (SELECT COUNT(*)::int FROM tasks sub WHERE sub.parent_task_id = t.id) as subtask_count
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN sprints s ON t.sprint_id = s.id
      LEFT JOIN software_epics e ON t.epic_id = e.id
      LEFT JOIN software_releases r ON t.release_id = r.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE 1=1
    `;

    if (project_id) {
      const proj = await getAccessibleProject(scope, toId(project_id));
      if (!proj) return fail(res, 404, 'Project not found');
      sql += ` AND t.project_id = ?`;
      params.push(project_id);
    } else if (!scope.global) {
      sql += ` AND t.venture_id = ?`;
      params.push(scope.ventureId);
    }

    if (sprint_id !== undefined) {
      if (sprint_id === 'backlog') {
        sql += ` AND t.sprint_id IS NULL`;
      } else if (toId(sprint_id)) {
        sql += ` AND t.sprint_id = ?`;
        params.push(toId(sprint_id));
      }
    }

    if (epic_id && toId(epic_id)) {
      sql += ` AND t.epic_id = ?`;
      params.push(toId(epic_id));
    }

    if (release_id && toId(release_id)) {
      sql += ` AND t.release_id = ?`;
      params.push(toId(release_id));
    }

    if (issue_type) {
      sql += ` AND t.issue_type = ?`;
      params.push(issue_type);
    }

    if (status) {
      sql += ` AND t.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY t.board_order ASC, t.created_at DESC`;
    const [issues] = await pool.query(sql, params);
    return res.json({ success: true, data: issues.map(i => ({ ...i, assignees: i.assignees || [] })) });
  } catch (error) {
    console.error('getSoftwareIssues error:', error);
    return fail(res, 500, 'Failed to fetch software issues');
  }
};

const createSoftwareIssue = async (req, res) => {
  try {
    const { scope } = req;
    const {
      project_id, title, description, issue_type = 'story', priority = 'medium',
      story_points, sprint_id, epic_id, release_id, estimate_hours, environment,
      steps_to_reproduce, acceptance_criteria, assigned_to
    } = req.body;

    if (!project_id || !title) return fail(res, 400, 'Project ID and Title are required');

    const resolved = await resolveProjectAndVenture(scope, project_id);
    if (!resolved) return fail(res, 404, 'Project not found');

    const issueKey = await generateNextKey(project_id, 'FEN');
    const assigneeId = toId(assigned_to) || scope.userId;

    const [result] = await pool.query(
      `INSERT INTO tasks (
        title, description, status, priority, assigned_to, assigned_by,
        venture_id, project_id, issue_key, issue_type, story_points, sprint_id,
        epic_id, release_id, estimate_hours, environment, steps_to_reproduce, acceptance_criteria, board_order
      ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        title, description || null, priority, assigneeId, scope.userId,
        resolved.ventureId, project_id, issueKey, issue_type, story_points || null,
        toId(sprint_id), toId(epic_id), toId(release_id), estimate_hours || null,
        environment || null, steps_to_reproduce || null, acceptance_criteria || null, 0
      ]
    );

    const taskId = result.insertId;
    if (taskId) {
      await pool.query('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [taskId, assigneeId]);
    }

    return res.status(201).json({ success: true, data: { id: taskId, issue_key: issueKey, title } });
  } catch (error) {
    console.error('createSoftwareIssue error:', error);
    return fail(res, 500, 'Failed to create software issue');
  }
};

const updateSoftwareIssue = async (req, res) => {
  try {
    const { scope } = req;
    const id = toId(req.params.id);
    const task = await getAccessibleTask(scope, id);
    if (!task) return fail(res, 404, 'Issue not found');

    const {
      title, description, status, priority, issue_type, story_points, sprint_id,
      epic_id, release_id, estimate_hours, time_spent_hours, resolution, environment,
      steps_to_reproduce, acceptance_criteria, board_order
    } = req.body;

    const updates = [];
    const params = [];

    if (title) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (status) { updates.push('status = ?'); params.push(status); }
    if (priority) { updates.push('priority = ?'); params.push(priority); }
    if (issue_type) { updates.push('issue_type = ?'); params.push(issue_type); }
    if (story_points !== undefined) { updates.push('story_points = ?'); params.push(story_points); }
    if (sprint_id !== undefined) { updates.push('sprint_id = ?'); params.push(toId(sprint_id)); }
    if (epic_id !== undefined) { updates.push('epic_id = ?'); params.push(toId(epic_id)); }
    if (release_id !== undefined) { updates.push('release_id = ?'); params.push(toId(release_id)); }
    if (estimate_hours !== undefined) { updates.push('estimate_hours = ?'); params.push(estimate_hours); }
    if (time_spent_hours !== undefined) { updates.push('time_spent_hours = ?'); params.push(time_spent_hours); }
    if (resolution !== undefined) { updates.push('resolution = ?'); params.push(resolution); }
    if (environment !== undefined) { updates.push('environment = ?'); params.push(environment); }
    if (steps_to_reproduce !== undefined) { updates.push('steps_to_reproduce = ?'); params.push(steps_to_reproduce); }
    if (acceptance_criteria !== undefined) { updates.push('acceptance_criteria = ?'); params.push(acceptance_criteria); }
    if (board_order !== undefined) { updates.push('board_order = ?'); params.push(board_order); }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE tasks SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
    }

    return res.json({ success: true, message: 'Issue updated' });
  } catch (error) {
    console.error('updateSoftwareIssue error:', error);
    return fail(res, 500, 'Failed to update software issue');
  }
};

// Comments
const getIssueComments = async (req, res) => {
  try {
    const taskId = toId(req.params.id);
    const [comments] = await pool.query(
      `SELECT c.*, u.full_name as author_name, u.avatar_url as author_avatar
       FROM task_comments c
       JOIN users u ON c.author_id = u.id
       WHERE c.task_id = ?
       ORDER BY c.created_at ASC`,
      [taskId]
    );
    return res.json({ success: true, data: comments });
  } catch (error) {
    console.error('getIssueComments error:', error);
    return fail(res, 500, 'Failed to fetch comments');
  }
};

const addIssueComment = async (req, res) => {
  try {
    const { scope } = req;
    const taskId = toId(req.params.id);
    const { content } = req.body;
    if (!content) return fail(res, 400, 'Comment content is required');

    const [result] = await pool.query(
      `INSERT INTO task_comments (task_id, author_id, content) VALUES (?, ?, ?) RETURNING id`,
      [taskId, scope.userId, content]
    );

    return res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error('addIssueComment error:', error);
    return fail(res, 500, 'Failed to add comment');
  }
};

// Analytics & Velocity
const getSoftwareMetrics = async (req, res) => {
  try {
    const { scope } = req;
    const projectId = toId(req.query.project_id);

    let whereVenture = '';
    const params = [];
    if (projectId) {
      whereVenture = 'WHERE t.project_id = ?';
      params.push(projectId);
    } else if (!scope.global) {
      whereVenture = 'WHERE t.venture_id = ?';
      params.push(scope.ventureId);
    }

    const [types] = await pool.query(
      `SELECT COALESCE(t.issue_type, 'task') as type, COUNT(*)::int as count 
       FROM tasks t ${whereVenture} GROUP BY t.issue_type`,
      params
    );

    const [statuses] = await pool.query(
      `SELECT t.status, COUNT(*)::int as count 
       FROM tasks t ${whereVenture} GROUP BY t.status`,
      params
    );

    const [sprintVelocity] = await pool.query(
      `SELECT s.id, s.name, 
        COALESCE(SUM(t.story_points), 0)::int as committed_points,
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.story_points ELSE 0 END), 0)::int as completed_points
       FROM sprints s
       LEFT JOIN tasks t ON t.sprint_id = s.id
       ${projectId ? 'WHERE s.project_id = ?' : !scope.global ? 'WHERE s.venture_id = ?' : ''}
       GROUP BY s.id, s.name, s.created_at
       ORDER BY s.created_at ASC LIMIT 6`,
      params
    );

    return res.json({
      success: true,
      data: {
        types,
        statuses,
        velocity: sprintVelocity
      }
    });
  } catch (error) {
    console.error('getSoftwareMetrics error:', error);
    return fail(res, 500, 'Failed to fetch software metrics');
  }
};

module.exports = {
  getEpics, createEpic, updateEpic, deleteEpic,
  getSprints, createSprint, updateSprint, getSprintRetros, createSprintRetro,
  getReleases, createRelease, updateRelease,
  getSoftwareIssues, createSoftwareIssue, updateSoftwareIssue,
  getIssueComments, addIssueComment,
  getSoftwareMetrics
};
