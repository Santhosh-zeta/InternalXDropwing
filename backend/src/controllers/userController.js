const { supabase } = require('../config/supabase');
const { logEvent } = require('./timelineController');

const getPagination = (query) => {
    const page  = Math.max(1, parseInt(query.page  || 1, 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || 50, 10)));
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;
    return { page, limit, from, to };
};

// GET /api/users
const getAllUsers = async (req, res) => {
    try {
        const { page, limit, from, to } = getPagination(req.query);
        let query = supabase
            .from('profiles')
            .select('*, companies!company_id(id, name)', { count: 'exact' })
            .order('full_name')
            .range(from, to);

        if (req.user.role === 'ceo') {
            query = query.eq('company_id', req.user.company_id);
        }
        const { data, error, count } = await query;
        if (error) throw error;
        res.json({ data: data || [], total: count ?? 0, page, limit });
    } catch (err) {
        console.error('[User-500]', err);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
};

// GET /api/users/company/:companyId
const getUsersByCompany = async (req, res) => {
    try {
        const { page, limit, from, to } = getPagination(req.query);
        const { data, error, count } = await supabase
            .from('profiles')
            .select('*, companies(name)', { count: 'exact' })
            .eq('company_id', req.params.companyId)
            .order('full_name')
            .range(from, to);
        if (error) throw error;
        res.json({ data: data || [], total: count ?? 0, page, limit });
    } catch (err) {
        console.error('[User-500]', err);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
};

// GET /api/users/:id
const getUserById = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*, companies!company_id(name)')
            .eq('id', req.params.id)
            .single();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'User not found' });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/users/me
const getMe = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*, companies(id, name)')
            .eq('id', req.user.id)
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/users
const createUser = async (req, res) => {
    try {
        const { email, password, full_name, role, company_id, designation, phone } = req.body;

        if (req.user.role === 'ceo' && role === 'managing_director') {
            return res.status(403).json({ error: 'CEOs cannot create MD accounts' });
        }

        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email, password, email_confirm: true,
        });
        if (authError) throw authError;

        const effectiveCompanyId = company_id || req.user.company_id || null;
        const { data: userProfile, error: roleError } = await supabase
            .from('profiles')
            .insert({ id: authUser.user.id, full_name, role, company_id: effectiveCompanyId, designation, phone })
            .select().single();
        if (roleError) throw roleError;

        logEvent({
            type: 'user', action: `${full_name} joined as ${role}`,
            actor_id: req.user.id, target_id: authUser.user.id, target_name: full_name,
            company_id: effectiveCompanyId, priority: 'important'
        });

        res.status(201).json(userProfile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/users/:id
const updateUser = async (req, res) => {
    try {
        const { full_name, role, company_id, designation, phone } = req.body;

        if (req.user.role === 'ceo' && role === 'managing_director') {
            return res.status(403).json({ error: 'CEOs cannot assign MD role' });
        }

        // Fetch previous role to detect changes
        const { data: prev } = await supabase.from('profiles').select('role, full_name, company_id').eq('id', req.params.id).single();

        const patch = {};
        if (full_name   !== undefined) patch.full_name   = full_name;
        if (role        !== undefined) patch.role        = role;
        if (company_id  !== undefined) patch.company_id  = company_id;
        if (designation !== undefined) patch.designation = designation;
        if (phone       !== undefined) patch.phone       = phone;

        const { data, error } = await supabase
            .from('profiles').update(patch).eq('id', req.params.id).select().single();
        if (error) throw error;

        if (prev && role !== undefined && prev.role !== role) {
            logEvent({
                type: 'user', action: `role changed: ${prev.full_name} → ${prev.role} to ${role}`,
                actor_id: req.user.id, target_id: req.params.id, target_name: prev.full_name,
                company_id: data.company_id || prev.company_id, priority: 'important'
            });
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/users/:id
const deleteUser = async (req, res) => {
    try {
        const { error: authError } = await supabase.auth.admin.deleteUser(req.params.id);
        if (authError) throw authError;
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAllUsers, getUsersByCompany, getUserById, getMe, createUser, updateUser, deleteUser };
