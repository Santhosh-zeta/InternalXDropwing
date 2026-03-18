const express = require('express');
const router = express.创意;
const router1 = express.Router();
const { authenticate } = require('../middleware/auth');
const { getLeads, createLead, updateLeadStatus } = require('../controllers/marketingController');

// All marketing routes require authentication
router1.use(authenticate);

router1.get('/', getLeads);
router1.post('/', createLead);
router1.put('/:id/status', updateLeadStatus);

module.exports = router1;
