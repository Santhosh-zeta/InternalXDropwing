/**
 * "Ask InternalX": read-only assistant over the caller's own scoped data.
 *
 *   GET    /api/assistant/status
 *   GET    /api/assistant/conversations
 *   GET    /api/assistant/conversations/:id
 *   DELETE /api/assistant/conversations/:id
 *   POST   /api/assistant/chat            (Server-Sent Events)
 *   POST   /api/assistant/notes/propose   meeting notes -> draft tasks (managers; writes nothing)
 *   POST   /api/assistant/notes/create    create the drafts a manager confirmed (existing task path)
 *
 * Clients (L9) never get the assistant. Without a provider key (ANTHROPIC_API_KEY, OPENAI_API_KEY or GEMINI_API_KEY) the feature
 * reports "not configured" and nothing else changes.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const { withScope, internalOnly } = require('../utils/scope');
const { config } = require('../services/assistant/client');
const { getProvider } = require('../services/ai');
const { userMessage } = require('../services/ai/errors');
const { runTurn, AgentAbort } = require('../services/assistant/agent');
const { ToolError, todayIn } = require('../services/assistant/queries');
const usage = require('../services/assistant/usage');
const store = require('../services/assistant/store');
const notesTasks = require('../services/assistant/notesTasks');
const { logAudit } = require('../services/audit.service');

const router = express.Router();
router.use(authenticate, withScope, internalOnly);

const MAX_MESSAGE = 4000;

// Per-user (not per-IP) burst limit. Off under test unless explicitly configured.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: parseInt(process.env.ASSISTANT_RATE_PER_MIN, 10) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test' && !process.env.ASSISTANT_RATE_PER_MIN,
  keyGenerator: (req) => `assistant:${req.user.id}`,
  handler: (req, res) => res.status(429).json({ success: false, code: 'rate_limited', message: 'Slow down a little and try again in a minute.' }),
});

const suggestionsFor = (scope) => {
  if (scope.global || scope.isVentureAdmin) {
    return [
      "What's overdue in my projects?",
      "Who is overloaded this week?",
      'Which projects need attention?',
      'Summarize hours logged this month',
    ];
  }
  return [
    'What are my open tasks, most urgent first?',
    'What is due in the next two weeks?',
    'How many hours did I log this month?',
    'Any new announcements?',
  ];
};

router.get('/status', (req, res) => {
  const provider = getProvider();
  const configured = !!provider;
  const cfg = config();
  res.json({
    success: true,
    data: {
      configured,
      provider: provider ? provider.name : null,
      model: provider ? provider.status().model : null,
      // Only people who can change the server environment see how to set it up.
      setupHint: !configured && req.scope.level <= 3
        ? 'Add ANTHROPIC_API_KEY, OPENAI_API_KEY or GEMINI_API_KEY to the backend environment (see backend/.env.example) and restart the server.'
        : null,
      suggestions: suggestionsFor(req.scope),
      limits: { dailyMessages: cfg.dailyMessageCap, dailyTokens: cfg.dailyTokenCap },
    },
  });
});

router.get('/conversations', async (req, res) => {
  try {
    res.json({ success: true, data: await store.listConversations(req.scope.userId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/conversations/:id', async (req, res) => {
  try {
    const conv = await store.getConversation(req.scope.userId, req.params.id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    res.json({ success: true, data: { ...conv, messages: await store.uiMessages(conv.id) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/conversations/:id', async (req, res) => {
  try {
    const ok = await store.deleteConversation(req.scope.userId, req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: 'Conversation not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/** One-line description of the session, prefixed to each user turn (kept out of the cached system prompt). */
const contextLine = async (scope) => {
  const [rows] = await pool.query(
    `SELECT u.full_name, al.level_name, v.name AS venture
     FROM users u JOIN access_levels al ON al.level_number = u.access_level LEFT JOIN ventures v ON v.id = u.venture_id
     WHERE u.id = $1`,
    [scope.userId]
  );
  const r = rows[0] || {};
  const clean = (s) => String(s || '').replace(/[<>\n\r]/g, ' ').slice(0, 100);
  const tz = process.env.APP_TIMEZONE || 'Asia/Kolkata';
  return `<context>Today is ${todayIn(tz)} (${tz}). User: ${clean(r.full_name)}. Access level ${scope.level} (${clean(r.level_name)}). Venture: ${clean(r.venture) || 'all ventures (global)'}.</context>`;
};

router.post('/chat', chatLimiter, async (req, res) => {
  const provider = getProvider();
  if (!provider) {
    return res.status(503).json({ success: false, code: 'not_configured', message: 'The assistant is not configured on this server.' });
  }
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ success: false, message: 'Message is required' });
  if (message.length > MAX_MESSAGE) return res.status(400).json({ success: false, message: `Message is too long (max ${MAX_MESSAGE} characters)` });

  try {
    const { scope } = req;
    let conv = null;
    const wantedId = req.body.conversationId;
    if (wantedId !== undefined && wantedId !== null && wantedId !== '') {
      conv = await store.getConversation(scope.userId, wantedId);
      if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const caps = await usage.checkCaps(scope.userId);
    if (!caps.ok) return res.status(429).json({ success: false, code: 'daily_limit', message: caps.reason });

    if (!conv) conv = await store.createConversation(scope.userId, message.slice(0, 60));
    await usage.record(scope.userId, { messages: 1 });
    const cfg = config();
    const history = await store.loadHistory(conv.id, cfg.historyRows);
    const line = await contextLine(scope);

    res.status(200).set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    const controller = new AbortController();
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    const emit = (event) => { if (!res.writableEnded && !res.destroyed) res.write(`data: ${JSON.stringify(event)}\n\n`); };

    emit({ type: 'conversation', id: conv.id, title: conv.title });
    try {
      const result = await runTurn({
        provider, cfg, user: req.user, conversationId: conv.id, history, userText: message, contextLine: line,
        emit, signal: controller.signal, remainingTokens: caps.remainingTokens, ip: req.ip,
      });
      emit({ type: 'done', usage: { input_tokens: result.inputTokens, output_tokens: result.outputTokens }, stop_reason: result.stopReason });
    } catch (err) {
      if (err instanceof AgentAbort) return res.end();
      if (!(err instanceof ToolError)) console.error('[assistant] chat failed:', err.message);
      emit({ type: 'error', message: err instanceof ToolError ? err.message : userMessage(err) });
    }
    res.end();
  } catch (err) {
    console.error('[assistant] chat setup failed:', err.message);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Server error' });
    else res.end();
  }
});

// ── Meeting notes -> tasks (managers and above) ──────────────────────────────

const managersOnly = (req, res, next) => {
  if (!(req.scope.global || req.scope.isVentureAdmin)) {
    return res.status(403).json({ success: false, message: 'Turning notes into tasks is available to managers and above' });
  }
  next();
};

router.post('/notes/propose', managersOnly, chatLimiter, async (req, res) => {
  const provider = getProvider();
  if (!provider) return res.status(503).json({ success: false, code: 'not_configured', message: 'The assistant is not configured on this server.' });
  try {
    const caps = await usage.checkCaps(req.scope.userId);
    if (!caps.ok) return res.status(429).json({ success: false, code: 'daily_limit', message: caps.reason });
    await usage.record(req.scope.userId, { messages: 1 });
    const data = await notesTasks.propose({ provider, scope: req.scope, user: req.user, notes: req.body && req.body.notes, ip: req.ip });
    await logAudit(req.user.id, 'ASSISTANT_NOTES_PROPOSE', 'assistant', null, { drafts: data.drafts.length }, req.ip);
    res.json({ success: true, data });
  } catch (err) {
    if (err instanceof ToolError) return res.status(400).json({ success: false, message: err.message });
    console.error('[assistant] notes propose failed:', err.message);
    res.status(502).json({ success: false, message: userMessage(err) });
  }
});

router.post('/notes/create', managersOnly, async (req, res) => {
  try {
    const results = await notesTasks.createConfirmed({ req, items: req.body && req.body.tasks });
    const ids = results.filter((r) => r.ok).map((r) => r.id);
    await logAudit(req.user.id, 'ASSISTANT_NOTES_CREATE', 'assistant', null, { created: ids, failed: results.length - ids.length }, req.ip);
    res.json({ success: true, data: { created: ids.length, failed: results.length - ids.length, results } });
  } catch (err) {
    if (err instanceof ToolError) return res.status(400).json({ success: false, message: err.message });
    console.error('[assistant] notes create failed:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
