const { supabase } = require('../config/supabase');

// GET /api/marketing
const getLeads = async (req, res) => {
    try {
        const { role, company_id } = req.user;

        let query = supabase
            .from('marketing_leads')
            .select('*, assigned:profiles!marketing_leads_assigned_to_fkey(id, full_name)')
            .order('created_at', { ascending: false });

        if (role !== 'managing_director' && role !== 'admin') {
            query = query.eq('company_id', company_id);
        }

        const { data, error } = await query;
        if (error) throw error;

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/marketing
const createLead = async (req, res) => {
    try {
        const { client_name, project_type, estimated_value, assigned_to } = req.body;
        const { company_id } = req.user;

        const { data, error } = await supabase
            .from('marketing_leads')
            .insert({
                client_name,
                project_type,
                estimated_value: estimated_value || 0,
                assigned_to,
                company_id
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/marketing/:id/status
const updateLeadStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const { data, error } = await supabase
            .from('marketing_leads')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getLeads, createLead, updateLeadStatus };
