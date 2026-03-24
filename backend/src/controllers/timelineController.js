const { supabase } = require('../config/supabase');

// ── Helper: log a timeline event ──────────────────────────────────────────────
const logEvent = async ({ type, action, actor_id, target_id, target_name, metadata = {}, company_id = null, priority = 'normal' }) => {
    try {
        await supabase.from('system_timeline').insert({
            type, action, actor_id, target_id, target_name,
            metadata, company_id, priority
        });
    } catch (err) {
        // Never let logging break main flow
        console.error('[Timeline Log Error]', err.message);
    }
};

// GET /api/timeline  ── role-scoped feed
const getTimeline = async (req, res) => {
    try {
        const { role, id: userId, company_id } = req.user;
        const { type, time, limit = 60 } = req.query;

        let query = supabase
            .from('system_timeline')
            .select(`*, actor:actor_id(id, full_name, role)`)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        // Role scoping
        if (!['managing_director', 'admin'].includes(role)) {
            if (role === 'ceo') {
                query = query.eq('company_id', company_id);
            } else {
                // Managers / Employees: company scope only
                query = query.eq('company_id', company_id);
            }
        }

        // Type filter
        if (type && type !== 'all') query = query.eq('type', type);

        // Time filter
        if (time && time !== 'all') {
            const now = new Date();
            const hoursMap = { '1h': 1, '24h': 24, '7d': 168, '30d': 720 };
            const hours = hoursMap[time];
            if (hours) {
                const since = new Date(now - hours * 3600 * 1000).toISOString();
                query = query.gte('created_at', since);
            }
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getTimeline, logEvent };
