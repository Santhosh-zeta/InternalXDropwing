const { supabase } = require('../config/supabase');

// GET /api/announcements
const getAnnouncements = async (req, res) => {
    try {
        const { role, venture_id } = req.user;
        if (role === 'client') return res.status(403).json({ error: 'Access denied' });

        let query = supabase
            .from('announcements')
            .select('*, author:user_roles!announcements_created_by_fkey(id, full_name, role), venture:ventures(name)')
            .order('created_at', { ascending: false });

        if (role !== 'managing_director' && role !== 'admin') {
            query = query.or(`venture_id.is.null,venture_id.eq.${venture_id}`);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/announcements
const createAnnouncement = async (req, res) => {
    try {
        const { title, body, venture_id } = req.body;
        const { role, id: userId, venture_id: userVentureId } = req.user;
        const effectiveVentureId = (role === 'managing_director' || role === 'admin')
            ? (venture_id || null) : userVentureId;

        const { data, error } = await supabase
            .from('announcements')
            .insert({ title, body, venture_id: effectiveVentureId, created_by: userId })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/announcements/:id
const deleteAnnouncement = async (req, res) => {
    try {
        const { id: userId, role } = req.user;
        const { data: ann } = await supabase.from('announcements').select('created_by').eq('id', req.params.id).single();
        if (role !== 'managing_director' && role !== 'admin' && ann?.created_by !== userId) {
            return res.status(403).json({ error: 'Not authorized to delete this announcement' });
        }
        const { error } = await supabase.from('announcements').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Announcement deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAnnouncements, createAnnouncement, deleteAnnouncement };
