const { supabase } = require('../config/supabase');

// GET /api/projects
const getProjects = async (req, res) => {
    try {
        const { role, id: userId, venture_id } = req.user;
        let query = supabase
            .from('projects')
            .select('*, venture:ventures(name), client_projects(client:user_roles(id, full_name))')
            .order('created_at', { ascending: false });

        if (role === 'client') {
            const { data: cp } = await supabase.from('client_projects').select('project_id').eq('client_id', userId);
            const ids = cp?.map(r => r.project_id) || [];
            if (!ids.length) return res.json([]);
            query = query.in('id', ids);
        } else if (role === 'ceo' || role === 'manager') {
            query = query.eq('venture_id', venture_id);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/projects
const createProject = async (req, res) => {
    try {
        const { name, description, venture_id } = req.body;
        const effectiveVentureId = req.user.role === 'ceo' ? req.user.venture_id : venture_id;
        const { data, error } = await supabase
            .from('projects')
            .insert({ name, description, venture_id: effectiveVentureId })
            .select().single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/projects/:id
const updateProject = async (req, res) => {
    try {
        const { name, description, status } = req.body;
        const { data, error } = await supabase
            .from('projects').update({ name, description, status }).eq('id', req.params.id).select().single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/projects/:id/clients
const assignClient = async (req, res) => {
    try {
        const { client_id } = req.body;
        const { data, error } = await supabase
            .from('client_projects')
            .insert({ project_id: req.params.id, client_id })
            .select().single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getProjects, createProject, updateProject, assignClient };
