const { supabase } = require('../config/supabase');

// GET /api/tasks
const getTasks = async (req, res) => {
    try {
        const { role, id: userId, venture_id } = req.user;
        let query = supabase
            .from('tasks')
            .select(`
        *,
        assignee:user_roles!tasks_assignee_id_fkey(id, full_name, email),
        team:teams(id, name, venture_id)
      `)
            .order('created_at', { ascending: false });

        if (role === 'intern') {
            query = query.eq('assignee_id', userId);
        } else if (role === 'manager') {
            const { data: mTeams } = await supabase.from('teams').select('id').eq('manager_id', userId);
            const ids = mTeams?.map(t => t.id) || [];
            if (!ids.length) return res.json([]);
            query = query.in('team_id', ids);
        } else if (role === 'ceo') {
            const { data: vTeams } = await supabase.from('teams').select('id').eq('venture_id', venture_id);
            const ids = vTeams?.map(t => t.id) || [];
            if (!ids.length) return res.json([]);
            query = query.in('team_id', ids);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/tasks
const createTask = async (req, res) => {
    try {
        const { title, description, assignee_id, team_id, due_date, status } = req.body;
        const { data, error } = await supabase
            .from('tasks')
            .insert({ title, description, assignee_id: assignee_id || null, team_id: team_id || null, due_date: due_date || null, status: status || 'todo' })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/tasks/:id
const updateTask = async (req, res) => {
    try {
        const { title, description, status, due_date, assignee_id } = req.body;
        const { role, id: userId } = req.user;

        if (role === 'intern') {
            const { data: task } = await supabase.from('tasks').select('assignee_id').eq('id', req.params.id).single();
            if (task?.assignee_id !== userId) {
                return res.status(403).json({ error: 'You can only update tasks assigned to you' });
            }
            const { data, error } = await supabase
                .from('tasks').update({ status }).eq('id', req.params.id).select().single();
            if (error) throw error;
            return res.json(data);
        }

        const { data, error } = await supabase
            .from('tasks')
            .update({ title, description, status, due_date, assignee_id })
            .eq('id', req.params.id).select().single();
        if (error) throw error;
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

module.exports = { getTasks, createTask, updateTask, deleteTask };
