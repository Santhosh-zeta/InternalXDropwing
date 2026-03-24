const { supabase } = require('../config/supabase');
const { logEvent } = require('./timelineController');

// ─── Pagination helper ────────────────────────────────────────────────────────
// Returns { from, to, page, limit } for Supabase range queries
const getPagination = (query) => {
    const page  = Math.max(1, parseInt(query.page  || 1, 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || 50, 10)));
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;
    return { page, limit, from, to };
};

// GET /api/tasks
const getTasks = async (req, res) => {
    try {
        const { role, id: userId, company_id } = req.user;
        const { page, limit, from, to } = getPagination(req.query);

        let query = supabase
            .from('tasks')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (['managing_director', 'admin'].includes(role)) {
            // MD/Admin: see all
        } else if (role === 'ceo') {
            query = query.eq('assigned_company_id', company_id);
        } else {
            // FIX: column is 'profile_id', not 'user_id'
            const { data: memberRows } = await supabase.from('team_members').select('team_id').eq('profile_id', userId);
            const userTeamIds = memberRows?.map(r => r.team_id) || [];

            if (role === 'manager') {
                const { data: mTeams } = await supabase.from('teams').select('id').eq('manager_id', userId);
                if (mTeams) mTeams.forEach(t => { if (!userTeamIds.includes(t.id)) userTeamIds.push(t.id); });
            }

            let visibilityRules = [];
            visibilityRules.push(`assigned_profiles.cs.{${userId}}`);
            visibilityRules.push(`assigned_roles.cs.{${role}}`);
            if (userTeamIds.length > 0) {
                visibilityRules.push(...userTeamIds.map(tid => `assigned_teams.cs.{${tid}}`));
            }
            if (company_id) {
                visibilityRules.push(`and(assigned_company_id.eq.${company_id},assigned_teams.eq.{},assigned_profiles.eq.{})`);
            }
            query = query.or(visibilityRules.join(','));
        }

        const { data, error, count } = await query;
        if (error) throw error;
        res.json({ data: data || [], total: count ?? 0, page, limit });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/tasks
const createTask = async (req, res) => {
    try {
        const { title, description, due_date, status, priority, project_id, assigned_company_id, assigned_teams, assigned_roles, assigned_profiles, meeting_info } = req.body;

        const profilesArr = Array.isArray(assigned_profiles) ? assigned_profiles : [];
        const teamsArr    = Array.isArray(assigned_teams)    ? assigned_teams    : [];
        const rolesArr    = Array.isArray(assigned_roles)    ? assigned_roles    : [];

        const { data, error } = await supabase
            .from('tasks')
            .insert({
                title, description,
                due_date: due_date || null,
                status: status || 'todo',
                priority: priority || 'medium',
                project_id: project_id || null,
                assigned_company_id: assigned_company_id || null,
                assigned_teams: teamsArr,
                assigned_roles: rolesArr,
                assigned_profiles: profilesArr,
                meeting_info: meeting_info || null,
                created_by: req.user.id,
            })
            .select().single();

        if (error) throw error;

        // Notification: resolve all assigned users
        let targetUsers = new Set(profilesArr);
        if (teamsArr.length > 0) {
            const { data: tm } = await supabase.from('team_members').select('profile_id').in('team_id', teamsArr);
            if (tm) tm.forEach(m => targetUsers.add(m.profile_id));
        }
        if (rolesArr.length > 0) {
            let roleQ = supabase.from('profiles').select('id').in('role', rolesArr);
            if (assigned_company_id) roleQ = roleQ.eq('company_id', assigned_company_id);
            const { data: p } = await roleQ;
            if (p) p.forEach(u => targetUsers.add(u.id));
        }
        if (targetUsers.size > 0) {
            await supabase.from('notifications').insert(
                Array.from(targetUsers).map(id => ({
                    user_id: id,
                    title: meeting_info ? 'Deployment Sync Request (Meeting)' : 'Operation Deployment',
                    message: `You have been assigned: ${title}`,
                    type: meeting_info ? 'meeting' : 'task',
                }))
            );
        }

        logEvent({
            type: 'task', action: `deployed task: "${title}"`,
            actor_id: req.user.id, target_id: data.id, target_name: title,
            metadata: { assigned_teams: teamsArr, assigned_company_id },
            company_id: assigned_company_id || null, priority: 'important'
        });

        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/tasks/:id — full payload update
const updateTask = async (req, res) => {
    try {
        const { role, id: userId } = req.user;
        const {
            title, description, status, due_date,
            is_blocked, block_reason,
            assigned_company_id, assigned_teams, assigned_roles, assigned_profiles
        } = req.body;

        if (status === 'done' && role === 'intern') {
            return res.status(403).json({ error: 'Interns cannot resolve tasks without manager approval.' });
        }

        const patch = {};
        if (title        !== undefined) patch.title       = title;
        if (description  !== undefined) patch.description = description;
        if (status       !== undefined) patch.status      = status;
        if (due_date     !== undefined) patch.due_date    = due_date;
        if (is_blocked   !== undefined) patch.is_blocked  = is_blocked;
        if (block_reason !== undefined) patch.block_reason = block_reason;

        const canReassign = ['managing_director', 'admin', 'ceo', 'manager'].includes(role);
        if (canReassign) {
            if (assigned_company_id !== undefined) patch.assigned_company_id = assigned_company_id;
            if (assigned_teams    !== undefined) patch.assigned_teams    = Array.isArray(assigned_teams)    ? assigned_teams    : [];
            if (assigned_roles    !== undefined) patch.assigned_roles    = Array.isArray(assigned_roles)    ? assigned_roles    : [];
            if (assigned_profiles !== undefined) patch.assigned_profiles = Array.isArray(assigned_profiles) ? assigned_profiles : [];
        }

        if (Object.keys(patch).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update.' });
        }

        const { data, error } = await supabase
            .from('tasks').update(patch).eq('id', req.params.id).select().single();
        if (error) throw error;

        if (status !== undefined) {
            logEvent({
                type: 'task', action: `changed task status to "${status}"`,
                actor_id: userId, target_id: req.params.id, target_name: data.title,
                company_id: data.assigned_company_id || null,
                priority: status === 'done' ? 'important' : 'normal'
            });
        }
        if (is_blocked !== undefined) {
            logEvent({
                type: 'task',
                action: is_blocked
                    ? `blocked task: "${data.title}"${block_reason ? ` — ${block_reason}` : ''}`
                    : `unblocked task: "${data.title}"`,
                actor_id: userId, target_id: req.params.id, target_name: data.title,
                company_id: data.assigned_company_id || null,
                priority: is_blocked ? 'critical' : 'important'
            });
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
    try {
        const { error } = await supabase.from('tasks').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/tasks/:id/comments
const getTaskComments = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('task_comments')
            .select('*, profiles:user_id(id, full_name, role)')
            .eq('task_id', req.params.id)
            .order('created_at', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/tasks/:id/comments
const addTaskComment = async (req, res) => {
    try {
        const { content } = req.body;
        if (!content?.trim()) return res.status(400).json({ error: 'Comment content is required.' });

        const { data, error } = await supabase
            .from('task_comments')
            .insert({ task_id: req.params.id, user_id: req.user.id, content: content.trim() })
            .select('*, profiles:user_id(id, full_name, role)')
            .single();
        if (error) throw error;

        // Log to task_activity
        await supabase.from('task_activity').insert({
            task_id: req.params.id, user_id: req.user.id,
            action: 'comment', detail: content.trim().slice(0, 200)
        });

        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/tasks/:id/activity
const getTaskActivity = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('task_activity')
            .select('*, profiles:user_id(id, full_name, role)')
            .eq('task_id', req.params.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── TASK FILES (PHASE 3) ──────────────────────────────────────────────────

const getTaskFiles = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('task_files')
            .select('*, uploader:uploader_id(id, full_name, avatar_url)')
            .eq('task_id', id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const attachFileMetadata = async (req, res) => {
    try {
        const { id } = req.params;
        const { file_name, file_size, file_type, storage_path } = req.body;
        
        const { data: task } = await supabase.from('tasks').select('company_id').eq('id', id).single();

        const { data, error } = await supabase
            .from('task_files')
            .insert([{
                task_id: id,
                uploader_id: req.user.id,
                file_name,
                file_size,
                file_type,
                storage_path
            }])
            .select()
            .single();

        if (error) throw error;

        await logEvent({
            type: 'task.file_attached',
            action: `attached file: ${file_name}`,
            actor_id: req.user.id,
            target_id: id,
            company_id: task?.company_id,
        });

        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const deleteTaskFile = async (req, res) => {
    try {
        const { id, fileId } = req.params;
        
        // Fetch metadata for the log before deletion
        const { data: file } = await supabase.from('task_files').select('file_name').eq('id', fileId).single();
        const { data: task } = await supabase.from('tasks').select('company_id').eq('id', id).single();

        const { error } = await supabase.from('task_files').delete().eq('id', fileId);
        if (error) throw error;

        await logEvent({
            type: 'task.file_deleted',
            action: `removed file: ${file?.file_name}`,
            actor_id: req.user.id,
            target_id: id,
            company_id: task?.company_id,
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { 
    getTasks, createTask, updateTask, deleteTask, 
    getTaskComments, addTaskComment, getTaskActivity,
    getTaskFiles, attachFileMetadata, deleteTaskFile
};
