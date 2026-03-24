const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getLeads, createLead, updateLeadStatus } = require('../controllers/marketingController');

// All marketing routes require authentication
router.use(authenticate);

router.get('/', getLeads);
router.post('/', createLead);
router.put('/:id/status', updateLeadStatus);

module.exports = router;
