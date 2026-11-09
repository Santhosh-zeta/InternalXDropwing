/**
 * GET /api/admin/system-status: configuration self-check for L1/L2 only
 * (config/selfcheck.js). Reports ok/warn/missing per setting with a fix hint,
 * never a secret value. `?verify=false` skips the SMTP connection test.
 */
const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { withScope, atLeast } = require('../utils/scope');
const { runSelfCheck } = require('../config/selfcheck');

const router = express.Router();

router.get('/system-status', authenticate, withScope, atLeast(2), async (req, res) => {
  try {
    res.json({ success: true, data: await runSelfCheck({ verify: req.query.verify !== 'false' }) });
  } catch (err) {
    req.log.error({ err }, 'system status failed');
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
