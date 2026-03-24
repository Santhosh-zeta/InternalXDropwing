const { supabase } = require('../config/supabase');
const { logEvent } = require('./timelineController');

const getPagination = (query) => {
    const page  = Math.max(1, parseInt(query.page  || 1, 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || 50, 10)));
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;
    return { page, limit, from, to };
};

// GET /api/teams
const getTeams = async (req, res) => {
    try {
        const { role, company_id, id: userId } = req.user;
        const { page, limit, from, to } = getPagination(req.query);

        let query = supabase
            .from('teams')
            .select(`*, companies!company_id(id, name), manager:profiles!teams_manager_id_fkey(id, full_name), team_members(user:profiles!team_members_profile_id_fkey(id, full_name, role))`, { count: 'exact' })
            .order('name')
            .range(from, to);

        if (role === 'ceo') {
            query = query.eq('company_id', company_id);
        } else if (role === 'manager') {
            query = query.eq('manager_id', userId);
        } else if (['intern', 'employee'].includes(role)) {
            const { data: memberRows } = await supabase
                .from('team_members').select('team_id').eq('profile_id', userId);
            const teamIds = memberRows?.map(r => r.team_id) || [];
            if (teamIds.length === 0) return res.json({ data: [], total: 0, page, limit });
            query = query.in('id', teamIds);
        }

        const { data, error, count } = await query;
        if (error) throw error;
        res.json({ data: data || [], total: count ?? 0, page, limit });
    } catch (err) {
        console.error('[Team-500]', err);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
};

// GET /api/teams/:id
const getTeamById = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('teams')
            .select(`*, companies(name), manager:profiles!teams_manager_id_fkey(id, full_name), team_members(user:profiles!team_members_profile_id_fkey(id, full_name, role))`)
            .eq('id', req.params.id)
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('[Team-500]', err);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
};

// POST /api/teams
const createTeam = async (req, res) => {
    try {
        const { name, company_id, manager_id } = req.body;
        const effectiveCompanyId = req.user.role === 'ceo' ? req.user.company_id : company_id;
        const { data, error } = await supabase
            .from('teams')
            .insert({ name, company_id: effectiveCompanyId, manager_id: manager_id || null })
            .select().single();
        if (error) throw error;
        logEvent({
            type: 'team', action: `created team: "${name}"`,
            actor_id: req.user.id, target_id: data.id, target_name: name,
            company_id: effectiveCompanyId || null, priority: 'normal'
        });
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/teams/:id
const updateTeam = async (req, res) => {
    try {
        const { name, manager_id } = req.body;
        const patch = {};
        if (name       !== undefined) patch.name       = name;
        if (manager_id !== undefined) patch.manager_id = manager_id;

        const { data, error } = await supabase
            .from('teams').update(patch).eq('id', req.params.id).select().single();
        if (error) throw error;

        if (manager_id !== undefined) {
            logEvent({
                type: 'team', action: `updated team lead for "${data.name}"`,
                actor_id: req.user.id, target_id: req.params.id, target_name: data.name,
                company_id: data.company_id || null, priority: 'important'
            });
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/teams/:id/members
const addTeamMember = async (req, res) => {
    try {
        const { user_id } = req.body;
        const { data, error } = await supabase
            .from('team_members')
            .insert({ team_id: req.params.id, profile_id: user_id })
            .select().single();
        if (error) throw error;

        // Fetch team name for log
        const { data: team } = await supabase.from('teams').select('name, company_id').eq('id', req.params.id).single();
        logEvent({
            type: 'team', action: `added member to team: "${team?.name || req.params.id}"`,
            actor_id: req.user.id, target_id: req.params.id, target_name: team?.name,
            company_id: team?.company_id || null, priority: 'normal'
        });

        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/teams/:id/members/:userId
const removeTeamMember = async (req, res) => {
    try {
        // FIX: column is 'profile_id', not 'user_id'
        const { error } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', req.params.id)
            .eq('profile_id', req.params.userId);
        if (error) throw error;

        const { data: team } = await supabase.from('teams').select('name, company_id').eq('id', req.params.id).single();
        logEvent({
            type: 'team', action: `removed member from team: "${team?.name || req.params.id}"`,
            actor_id: req.user.id, target_id: req.params.id, target_name: team?.name,
            company_id: team?.company_id || null, priority: 'normal'
        });

        res.json({ message: 'Member removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getTeams, getTeamById, createTeam, updateTeam, addTeamMember, removeTeamMember };
