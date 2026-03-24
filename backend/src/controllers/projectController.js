const { supabase } = require('../config/supabase');
const { logEvent } = require('./timelineController');

const getPagination = (query) => {
    const page  = Math.max(1, parseInt(query.page  || 1, 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || 50, 10)));
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;
    return { page, limit, from, to };
};

// GET /api/projects
const getProjects = async (req, res) => {
    try {
        const { role, id: userId, company_id } = req.user;
        const { page, limit, from, to } = getPagination(req.query);

        let query = supabase
            .from('projects')
            .select(`*, company:companies(name), client_projects(client:profiles(id, full_name)), project_teams(team:teams(id, name))`, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (role === 'client') {
            const { data: cp } = await supabase.from('client_projects').select('project_id').eq('client_id', userId);
            const ids = cp?.map(r => r.project_id) || [];
            if (!ids.length) return res.json({ data: [], total: 0, page, limit });
            query = query.in('id', ids);
        } else if (role === 'ceo' || role === 'manager') {
            query = query.eq('company_id', company_id);
        }

        const { data, error, count } = await query;
        if (error) throw error;
        res.json({ data: data || [], total: count ?? 0, page, limit });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/projects/:id
const getProjectById = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select(`*, company:companies(name), client_projects(client:profiles(id, full_name)), project_teams(team:teams(id, name, manager_id))`)
            .eq('id', req.params.id)
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/projects
const createProject = async (req, res) => {
    try {
        const { name, description, company_id, status, start_date, deadline } = req.body;
        const effectiveCompanyId = req.user.role === 'ceo' ? req.user.company_id : company_id;

        const { data, error } = await supabase
            .from('projects')
            .insert({ name, description, company_id: effectiveCompanyId, status: status || 'active', start_date: start_date || null, deadline: deadline || null })
            .select().single();
        if (error) throw error;

        logEvent({
            type: 'project', action: `created project: "${name}"`,
            actor_id: req.user.id, target_id: data.id, target_name: name,
            company_id: effectiveCompanyId || null, priority: 'important'
        });

        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/projects/:id
const updateProject = async (req, res) => {
    try {
        const { name, description, status, start_date, deadline } = req.body;
        const patch = {};
        if (name        !== undefined) patch.name        = name;
        if (description !== undefined) patch.description = description;
        if (status      !== undefined) patch.status      = status;
        if (start_date  !== undefined) patch.start_date  = start_date;
        if (deadline    !== undefined) patch.deadline    = deadline;

        const { data, error } = await supabase
            .from('projects').update(patch).eq('id', req.params.id).select().single();
        if (error) throw error;

        logEvent({
            type: 'project', action: `updated project: "${data.name}"${status ? ` — status: ${status}` : ''}`,
            actor_id: req.user.id, target_id: req.params.id, target_name: data.name,
            company_id: data.company_id || null, priority: 'normal'
        });

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/projects/:id/clients
const assignClient = async (req, res) => {
    try {
        const { client_id } = req.body;
        const { data: clientProfile, error: profileError } = await supabase
            .from('profiles').select('id, role').eq('id', client_id).single();
        if (profileError || !clientProfile) return res.status(404).json({ error: 'Client profile not found' });
        if (clientProfile.role !== 'client') return res.status(400).json({ error: 'Profile is not a client' });

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

// POST /api/projects/:id/teams  — assign a team to a project
const assignTeam = async (req, res) => {
    try {
        const { team_id } = req.body;
        if (!team_id) return res.status(400).json({ error: 'team_id is required' });

        const { data, error } = await supabase
            .from('project_teams')
            .insert({ project_id: req.params.id, team_id })
            .select().single();
        if (error) throw error;

        // Fetch names for log
        const [proj, team] = await Promise.all([
            supabase.from('projects').select('name, company_id').eq('id', req.params.id).single(),
            supabase.from('teams').select('name').eq('id', team_id).single(),
        ]);
        logEvent({
            type: 'project', action: `assigned team "${team.data?.name}" to project "${proj.data?.name}"`,
            actor_id: req.user.id, target_id: req.params.id, target_name: proj.data?.name,
            company_id: proj.data?.company_id || null, priority: 'normal'
        });

        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/projects/:id/teams/:teamId — remove team from project
const removeTeam = async (req, res) => {
    try {
        const { error } = await supabase
            .from('project_teams')
            .delete()
            .eq('project_id', req.params.id)
            .eq('team_id', req.params.teamId);
        if (error) throw error;
        res.json({ message: 'Team removed from project' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getProjects, getProjectById, createProject, updateProject, assignClient, assignTeam, removeTeam };
