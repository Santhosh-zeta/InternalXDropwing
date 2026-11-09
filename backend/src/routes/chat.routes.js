const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { withScope, internalOnly } = require('../utils/scope');
const chat = require('../services/chat.service');

router.use(authenticate, withScope, internalOnly); // clients have no internal chat

const handle = (fn) => async (req, res) => {
  try {
    res.json({ success: true, ...(await fn(req)) });
  } catch (err) {
    if (err instanceof chat.ChatError) return res.status(err.status).json({ success: false, message: err.message });
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/chat/channels - what the caller may open (no client access)
router.get('/channels', handle(async (req) => ({ data: await chat.listChannels(req.scope) })));

// GET /api/chat/messages?ventureId=<n>|global  OR  ?receiverId=<n>
router.get('/messages', handle(async (req) => ({
  data: await chat.listMessages(req.scope, { ventureId: req.query.ventureId, receiverId: req.query.receiverId }),
})));

// POST /api/chat/messages { content, ventureId | receiverId }
// Persists once and broadcasts from the server; sender is always the authenticated user.
router.post('/messages', handle(async (req) => ({
  data: await chat.sendMessage(req.app.get('io'), req.scope, {
    content: req.body.content, ventureId: req.body.ventureId, receiverId: req.body.receiverId,
  }),
})));

module.exports = router;
