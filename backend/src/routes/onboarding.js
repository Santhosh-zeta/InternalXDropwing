const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { supabase } = require('../config/supabase');
const { authenticate, requireRole, requireSameVenture } = require('../middleware/auth');

function isExpired(invite) {
  return invite?.expires_at && new Date(invite.expires_at).getTime() < Date.now();
}

function makeToken() {
  // 32 bytes -> 43 char base64url (unguessable, URL-safe)
  return crypto.randomBytes(32).toString('base64url');
}

function frontendBaseUrl(req) {
  return process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`.replace(':3001', ':5173');
}

// ─────────────────────────────────────────────────────────────────────────────
// Public endpoints (no auth) — secured by unguessable token
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/onboarding/public/:token
router.get('/public/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { data, error } = await supabase
      .from('onboarding_invites')
      .select('id, email, kind, status, venture_id, expires_at, submitted_at, ventures(id, name)')
      .eq('token', token)
      .single();
    if (error) return res.status(404).json({ error: 'Invalid invite link' });

    if (data.status === 'onboarded') return res.status(410).json({ error: 'This invite was already onboarded.' });

    if (isExpired(data) || data.status === 'expired') {
      if (data.status !== 'expired') {
        await supabase.from('onboarding_invites').update({ status: 'expired' }).eq('id', data.id);
      }
      return res.status(410).json({ error: 'This invite has expired.' });
    }

    res.json({
      id: data.id,
      email: data.email,
      kind: data.kind,
      status: data.status,
      venture: data.ventures || null,
      expires_at: data.expires_at,
      submitted_at: data.submitted_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/onboarding/public/:token/submit
router.post('/public/:token/submit', async (req, res) => {
  try {
    const { token } = req.params;
    const { full_name, phone, notes } = req.body || {};

    if (!full_name || String(full_name).trim().length < 2) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    const inviteRes = await supabase
      .from('onboarding_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteRes.error || !inviteRes.data) return res.status(404).json({ error: 'Invalid invite link' });
    const invite = inviteRes.data;

    if (invite.status === 'onboarded') return res.status(410).json({ error: 'This invite was already onboarded.' });
    if (isExpired(invite) || invite.status === 'expired') {
      if (invite.status !== 'expired') {
        await supabase.from('onboarding_invites').update({ status: 'expired' }).eq('id', invite.id);
      }
      return res.status(410).json({ error: 'This invite has expired.' });
    }

    const submission = {
      full_name: String(full_name).trim(),
      phone: phone ? String(phone).trim() : null,
      notes: notes ? String(notes).trim() : null,
      submitted_ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      submitted_user_agent: req.get('user-agent') || null,
    };

    const { data, error } = await supabase
      .from('onboarding_invites')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        submission,
      })
      .eq('id', invite.id)
      .select('id, status, submitted_at')
      .single();

    if (error) throw error;
    res.json({ message: 'Submitted successfully', ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin/staff endpoints (auth required)
// ─────────────────────────────────────────────────────────────────────────────

router.use(authenticate);

// GET /api/onboarding/invites
router.get('/invites', requireRole('managing_director', 'admin', 'ceo'), async (req, res) => {
  try {
    let query = supabase
      .from('onboarding_invites')
      .select('*, ventures(id, name)')
      .order('created_at', { ascending: false });

    if (req.user.role === 'ceo') {
      query = query.eq('venture_id', req.user.venture_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/onboarding/invites
router.post('/invites', requireRole('managing_director', 'admin', 'ceo'), requireSameVenture, async (req, res) => {
  try {
    const { email, venture_id, kind, expires_in_days } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const normalizedEmail = String(email).trim().toLowerCase();
    const targetVentureId = req.user.role === 'ceo' ? req.user.venture_id : (venture_id || null);
    if (!targetVentureId) return res.status(400).json({ error: 'venture_id is required' });

    const token = makeToken();
    const days = Number.isFinite(Number(expires_in_days)) ? Number(expires_in_days) : 7;
    const expiresAt = new Date(Date.now() + Math.max(1, Math.min(30, days)) * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('onboarding_invites')
      .insert({
        venture_id: targetVentureId,
        email: normalizedEmail,
        kind: kind === 'client' ? 'client' : 'member',
        token,
        status: 'created',
        created_by: req.user.id,
        expires_at: expiresAt,
      })
      .select('*, ventures(id, name)')
      .single();

    if (error) throw error;

    const link = `${frontendBaseUrl(req).replace(/\/$/, '')}/onboard/${token}`;
    res.status(201).json({ ...data, link });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/onboarding/invites/:id — update fields Ashwin controls before onboarding
router.patch('/invites/:id', requireRole('managing_director', 'admin', 'ceo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { decision_note, assigned_role, designation, expires_at } = req.body || {};

    const inviteRes = await supabase.from('onboarding_invites').select('*').eq('id', id).single();
    if (inviteRes.error || !inviteRes.data) return res.status(404).json({ error: 'Invite not found' });
    const invite = inviteRes.data;

    if (req.user.role === 'ceo' && invite.venture_id !== req.user.venture_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const patch = {};
    if (decision_note !== undefined) patch.decision_note = decision_note;
    if (assigned_role !== undefined) patch.assigned_role = assigned_role;
    if (designation !== undefined) patch.designation = designation;
    if (expires_at !== undefined) patch.expires_at = expires_at;

    const { data, error } = await supabase
      .from('onboarding_invites')
      .update(patch)
      .eq('id', id)
      .select('*, ventures(id, name)')
      .single();
    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/onboarding/invites/:id/decision
router.post('/invites/:id/decision', requireRole('managing_director', 'admin', 'ceo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, note, assigned_role, designation } = req.body || {};
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be approved or rejected' });
    }

    const inviteRes = await supabase.from('onboarding_invites').select('*').eq('id', id).single();
    if (inviteRes.error || !inviteRes.data) return res.status(404).json({ error: 'Invite not found' });
    const invite = inviteRes.data;

    if (req.user.role === 'ceo' && invite.venture_id !== req.user.venture_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (invite.status === 'onboarded') {
      return res.status(409).json({ error: 'Already onboarded' });
    }

    const nowIso = new Date().toISOString();
    const patch = {
      status: decision,
      decided_by: req.user.id,
      decision_note: note ?? invite.decision_note ?? null,
      assigned_role: assigned_role ?? invite.assigned_role ?? null,
      designation: designation ?? invite.designation ?? null,
      approved_at: decision === 'approved' ? nowIso : invite.approved_at,
      rejected_at: decision === 'rejected' ? nowIso : invite.rejected_at,
    };

    const { data, error } = await supabase
      .from('onboarding_invites')
      .update(patch)
      .eq('id', id)
      .select('*, ventures(id, name)')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/onboarding/invites/:id/onboard
router.post('/invites/:id/onboard', requireRole('managing_director', 'admin', 'ceo'), async (req, res) => {
  try {
    const { id } = req.params;

    const inviteRes = await supabase.from('onboarding_invites').select('*').eq('id', id).single();
    if (inviteRes.error || !inviteRes.data) return res.status(404).json({ error: 'Invite not found' });
    const invite = inviteRes.data;

    if (req.user.role === 'ceo' && invite.venture_id !== req.user.venture_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (invite.status !== 'approved') {
      return res.status(409).json({ error: 'Invite must be approved before onboarding' });
    }
    if (!invite.submission?.full_name) {
      return res.status(409).json({ error: 'Invite has no submission yet' });
    }

    const roleToAssign =
      invite.assigned_role ||
      (invite.kind === 'client' ? 'client' : 'intern');

    if (req.user.role === 'ceo' && roleToAssign === 'managing_director') {
      return res.status(403).json({ error: 'CEOs cannot assign MD role' });
    }

    const tempPassword = crypto.randomBytes(9).toString('base64url'); // ~12 chars

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: invite.email,
      password: tempPassword,
      email_confirm: true,
    });
    if (authError) throw authError;

    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .insert({
        id: authUser.user.id,
        email: invite.email,
        full_name: invite.submission.full_name,
        role: roleToAssign,
        venture_id: invite.venture_id,
        phone: invite.submission.phone || null,
        designation: invite.designation || null,
      })
      .select()
      .single();
    if (roleError) throw roleError;

    const { data: updatedInvite, error: updErr } = await supabase
      .from('onboarding_invites')
      .update({
        status: 'onboarded',
        onboarded_at: new Date().toISOString(),
        onboarded_user_id: authUser.user.id,
      })
      .eq('id', invite.id)
      .select('id, status, onboarded_at, onboarded_user_id')
      .single();
    if (updErr) throw updErr;

    res.json({
      message: 'User onboarded',
      user: userRole,
      invite: updatedInvite,
      temp_password: tempPassword, // show once to admin to share securely
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

