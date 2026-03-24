const { supabase } = require('../config/supabase');
const { logEvent } = require('./timelineController');

// GET /api/tasks/:id/approvals - Get all approvals for a task
exports.getTaskApprovals = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('approvals')
            .select(`
                *,
                requester:requester_id (id, full_name, role, avatar_url),
                reviewer:reviewer_id (id, full_name, role, avatar_url)
            `)
            .eq('task_id', id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('getTaskApprovals err:', err);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/tasks/:id/approvals - Request an approval
exports.requestApproval = async (req, res) => {
    try {
        const { id } = req.params; // task_id
        const { reviewer_id, notes } = req.body;
        const requester_id = req.user.id;

        // Fetch task to get company_id
        const { data: task } = await supabase.from('tasks').select('company_id').eq('id', id).single();

        const { data, error } = await supabase
            .from('approvals')
            .insert([{
                task_id: id,
                requester_id,
                reviewer_id,
                notes,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;

        await logEvent({
            type: 'task.approval_requested',
            action: `requested approval to close task`,
            actor_id: requester_id,
            target_id: id,
            company_id: task?.company_id,
            metadata: { approval_id: data.id, reviewer_id }
        });

        res.status(201).json(data);
    } catch (err) {
        console.error('requestApproval err:', err);
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/tasks/:id/approvals/:approvalId - Resolve approval (Approve/Reject)
exports.resolveApproval = async (req, res) => {
    try {
        const { id, approvalId } = req.params;
        const { status, notes } = req.body; // 'approved' or 'rejected'
        const resolver_id = req.user.id;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status must be approved or rejected' });
        }

        const { data: approval, error } = await supabase
            .from('approvals')
            .update({ status, notes, resolved_at: new Date().toISOString() })
            .eq('id', approvalId)
            .eq('task_id', id)
            .select()
            .single();

        if (error) throw error;

        // Fetch task to get company_id
        const { data: task } = await supabase.from('tasks').select('company_id').eq('id', id).single();

        // If approved, mark the actual task as done
        if (status === 'approved') {
            await supabase.from('tasks').update({ status: 'done' }).eq('id', id);
            
            await logEvent({
                type: 'task.status_changed',
                action: 'marked task as done (via approval)',
                actor_id: resolver_id,
                target_id: id,
                company_id: task?.company_id,
                metadata: { previous_status: 'in_progress', new_status: 'done', approval_id: approval.id }
            });
        } else {
            // Rejected
            await logEvent({
                type: 'task.approval_rejected',
                action: `rejected task approval`,
                actor_id: resolver_id,
                target_id: id,
                company_id: task?.company_id,
                metadata: { approval_id: approval.id, notes }
            });
        }

        res.json(approval);
    } catch (err) {
        console.error('resolveApproval err:', err);
        res.status(500).json({ error: err.message });
    }
};
