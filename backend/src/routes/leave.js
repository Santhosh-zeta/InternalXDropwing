const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { supabase } = require('../config/supabase');
const { sendLeaveStatus } = require('../services/emailService');

router.use(authenticate);

// GET /api/leave — my requests
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('leave_requests')
            .select('*, user:profiles!leave_requests_user_id_fkey(full_name, email), reviewer:profiles!leave_requests_reviewed_by_fkey(full_name)')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/leave/pending — for managers to review
router.get('/pending', requireRole('managing_director', 'admin', 'ceo', 'manager'), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('leave_requests')
            .select('*, user:profiles!leave_requests_user_id_fkey(full_name, email, company_id)')
            .eq('status', 'pending')
            .order('created_at');
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/leave — apply for leave
router.post('/', async (req, res) => {
    try {
        const { start_date, end_date, reason } = req.body;
        const { data, error } = await supabase
            .from('leave_requests')
            .insert({ user_id: req.user.id, start_date, end_date, reason, status: 'pending' })
            .select().single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/leave/:id — approve or reject
router.put('/:id', requireRole('managing_director', 'admin', 'ceo', 'manager'), async (req, res) => {
    try {
        const { status } = req.body;
        const { data: leave, error: fetchErr } = await supabase
            .from('leave_requests')
            .select('*, user:profiles!leave_requests_user_id_fkey(full_name, email)')
            .eq('id', req.params.id).single();
        if (fetchErr) throw fetchErr;

        const { data, error } = await supabase
            .from('leave_requests')
            .update({ status, reviewed_by: req.user.id, reviewed_at: new Date().toISOString() })
            .eq('id', req.params.id).select().single();
        if (error) throw error;

        // Send email notification
        if (leave?.user?.email) {
            sendLeaveStatus({
                to: leave.user.email,
                toName: leave.user.full_name,
                status,
                startDate: leave.start_date,
                endDate: leave.end_date,
                reviewedBy: req.user.full_name,
            }).catch(() => { }); // non-blocking
        }

        // Create in-app notification
        await supabase.from('notifications').insert({
            user_id: leave.user_id,
            type: 'leave_reviewed',
            message: `Your leave (${leave.start_date} – ${leave.end_date}) was ${status}`,
            link: '/leave',
        }).catch(() => { });

        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/leave/notify — send email (called from frontend)
router.post('/notify', async (req, res) => {
    res.json({ message: 'Notification queued' });
});

module.exports = router;
