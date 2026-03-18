const { supabase } = require('../config/supabase');

// GET /api/users — MD/admin sees all, CEO sees own venture
const getAllUsers = async (req, res) => {
    try {
        let query = supabase
            .from('user_roles')
            .select('*, ventures(id, name)')
            .order('full_name');

        if (req.user.role === 'ceo') {
            query = query.eq('venture_id', req.user.venture_id);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/users/venture/:ventureId
const getUsersByVenture = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('user_roles')
            .select('*, ventures(name)')
            .eq('venture_id', req.params.ventureId)
            .order('full_name');
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/users/:id
const getUserById = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('user_roles')
            .select('*, ventures(name)')
            .eq('id', req.params.id)
            .single();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'User not found' });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/users/me — current user's own profile
const getMe = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('user_roles')
            .select('*, ventures(id, name)')
            .eq('id', req.user.id)
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/users — Create Supabase Auth user + user_roles entry
const createUser = async (req, res) => {
    try {
        const { email, password, full_name, role, venture_id } = req.body;

        if (req.user.role === 'ceo' && role === 'managing_director') {
            return res.status(403).json({ error: 'CEOs cannot create MD accounts' });
        }

        // Create auth user
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });
        if (authError) throw authError;

        // Insert into user_roles
        const { data: userRole, error: roleError } = await supabase
            .from('user_roles')
            .insert({
                id: authUser.user.id,
                email,
                full_name,
                role,
                venture_id: venture_id || req.user.venture_id || null,
            })
            .select()
            .single();
        if (roleError) throw roleError;

        res.status(201).json(userRole);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/users/:id — Update user_roles
const updateUser = async (req, res) => {
    try {
        const { full_name, role, venture_id } = req.body;

        if (req.user.role === 'ceo' && role === 'managing_director') {
            return res.status(403).json({ error: 'CEOs cannot assign MD role' });
        }

        const { data, error } = await supabase
            .from('user_roles')
            .update({ full_name, role, venture_id })
            .eq('id', req.params.id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/users/:id — MD only
const deleteUser = async (req, res) => {
    try {
        const { error: authError } = await supabase.auth.admin.deleteUser(req.params.id);
        if (authError) throw authError;
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAllUsers, getUsersByVenture, getUserById, getMe, createUser, updateUser, deleteUser };
