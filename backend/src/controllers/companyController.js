const { supabase } = require('../config/supabase');
const { logEvent } = require('./timelineController');

const getPagination = (query) => {
    const page  = Math.max(1, parseInt(query.page  || 1, 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || 50, 10)));
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;
    return { page, limit, from, to };
};

// GET /api/companies
const getCompanies = async (req, res) => {
    try {
        const { page, limit, from, to } = getPagination(req.query);
        let query = supabase
            .from('companies')
            .select('*', { count: 'exact' })
            .order('name')
            .range(from, to);

        if (req.user.role === 'ceo') {
            query = query.eq('id', req.user.company_id);
        }
        const { data, error, count } = await query;
        if (error) throw error;
        res.json({ data: data || [], total: count ?? 0, page, limit });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/companies/:id — with members, teams, projects summary
const getCompanyById = async (req, res) => {
    try {
        if (req.user.role === 'ceo' && req.params.id !== req.user.company_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [companyRes, usersRes, teamsRes, projectsRes] = await Promise.all([
            supabase.from('companies').select('*').eq('id', req.params.id).single(),
            supabase.from('profiles').select('id, full_name, role, designation').eq('company_id', req.params.id),
            supabase.from('teams').select('id, name, manager_id').eq('company_id', req.params.id),
            supabase.from('projects').select('id, name, status').eq('company_id', req.params.id),
        ]);

        if (companyRes.error) throw companyRes.error;
        if (!companyRes.data) return res.status(404).json({ error: 'Company not found' });

        res.json({
            ...companyRes.data,
            members: usersRes.data || [],
            teams: teamsRes.data || [],
            projects: projectsRes.data || [],
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/companies — MD only
const createCompany = async (req, res) => {
    try {
        const { name, status } = req.body;
        const { data, error } = await supabase
            .from('companies')
            .insert({ name, status: status || 'active' })
            .select().single();
        if (error) throw error;

        logEvent({
            type: 'system', action: `created venture: "${name}"`,
            actor_id: req.user.id, target_id: data.id, target_name: name,
            company_id: data.id, priority: 'important'
        });

        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/companies/:id — MD only
const updateCompany = async (req, res) => {
    try {
        const { name, status, ceo_id } = req.body;

        const { data: prev } = await supabase.from('companies').select('status, name').eq('id', req.params.id).single();

        const patch = {};
        if (name   !== undefined) patch.name   = name;
        if (status !== undefined) patch.status = status;
        if (ceo_id !== undefined) patch.ceo_id = ceo_id;

        const { data, error } = await supabase
            .from('companies').update(patch).eq('id', req.params.id).select().single();
        if (error) throw error;

        if (prev && status !== undefined && prev.status !== status) {
            logEvent({
                type: 'system',
                action: `venture "${data.name}" status changed: ${prev.status} → ${status}`,
                actor_id: req.user.id, target_id: req.params.id, target_name: data.name,
                company_id: req.params.id,
                priority: status === 'inactive' || status === 'suspended' ? 'critical' : 'important'
            });
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getCompanies, getCompanyById, createCompany, updateCompany };
