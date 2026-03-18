const { supabase } = require('../config/supabase');

// GET /api/teams
const getTeams = async (req, res) => {
    try {
        const { role, venture_id, id: userId } = req.user;
        let query = supabase
            .from('teams')
            .select(`
        *,
        ventures(id, name),
        manager:user_roles!teams_manager_id_fkey(id, full_name, email),
        team_members(user:user_roles(id, full_name, email, role))
      `)
            .order('name');

        if (role === 'ceo') {
            query = query.eq('venture_id', venture_id);
        } else if (role === 'manager') {
            query = query.eq('manager_id', userId);
        } else if (role === 'intern') {
            const { data: memberRows } = await supabase
                .from('team_members').select('team_id').eq('user_id', userId);
            const teamIds = memberRows?.map(r => r.team_id) || [];
            if (teamIds.length === 0) return res.json([]);
            query = query.in('id', teamIds);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/teams/:id
const getTeamById = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('teams')
            .select(`
        *,
        ventures(name),
        manager:user_roles!teams_manager_id_fkey(id, full_name, email),
        team_members(user:user_roles(id, full_name, email, role))
      `)
            .eq('id', req.params.id)
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/teams
const createTeam = async (req, res) => {
    try {
        const { name, venture_id, manager_id } = req.body;
        const effectiveVentureId = req.user.role === 'ceo' ? req.user.venture_id : venture_id;
        const { data, error } = await supabase
            .from('teams')
            .insert({ name, venture_id: effectiveVentureId, manager_id: manager_id || null })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/teams/:id
const updateTeam = async (req, res) => {
    try {
        const { name, manager_id } = req.body;
        const { data, error } = await supabase
            .from('teams').update({ name, manager_id }).eq('id', req.params.id).select().single();
        if (error) throw error;
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
            .insert({ team_id: req.params.id, user_id })
            .select().single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/teams/:id/members/:userId
const removeTeamMember = async (req, res) => {
    try {
        const { error } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', req.params.id)
            .eq('user_id', req.params.userId);
        if (error) throw error;
        res.json({ message: 'Member removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getTeams, getTeamById, createTeam, updateTeam, addTeamMember, removeTeamMember };
