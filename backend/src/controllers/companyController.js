const { supabase } = require('../config/supabase');

// GET /api/ventures
const getVentures = async (req, res) => {
    try {
        let query = supabase.from('ventures').select('*').order('name');

        if (req.user.role === 'ceo') {
            query = query.eq('id', req.user.venture_id);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/ventures/:id — with members
const getVentureById = async (req, res) => {
    try {
        if (req.user.role === 'ceo' && req.params.id !== req.user.venture_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [ventureRes, usersRes] = await Promise.all([
            supabase.from('ventures').select('*').eq('id', req.params.id).single(),
            supabase.from('user_roles').select('id, full_name, role, email').eq('venture_id', req.params.id),
        ]);

        if (ventureRes.error) throw ventureRes.error;
        if (!ventureRes.data) return res.status(404).json({ error: 'Venture not found' });

        res.json({ ...ventureRes.data, members: usersRes.data || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/ventures — MD only
const createVenture = async (req, res) => {
    try {
        const { name } = req.body;
        const { data, error } = await supabase
            .from('ventures')
            .insert({ name })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/ventures/:id — MD only
const updateVenture = async (req, res) => {
    try {
        const { name } = req.body;
        const { data, error } = await supabase
            .from('ventures')
            .update({ name })
            .eq('id', req.params.id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getVentures, getVentureById, createVenture, updateVenture };
