const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { withScope } = require('../utils/scope');
const { search } = require('../services/search.service');

router.use(authenticate, withScope);

// GET /api/search?q=term[&limit=5] — grouped hits, always filtered by the caller's scope in SQL
router.get('/', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    if (q.trim().length < 2) return res.json({ success: true, data: { groups: {} } });
    const data = await search(req.scope, q, { limit: req.query.limit });
    res.json({ success: true, data });
  } catch (err) {
    console.error('search failed:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
