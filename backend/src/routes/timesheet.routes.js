const express = require('express');
const router = express.Router();
const timesheetController = require('../controllers/timesheet.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { logHoursRules, approveTimesheetRules } = require('../middleware/validate.middleware');
const { reportLimiter } = require('../middleware/rateLimit.middleware');

router.use(authenticate);

// Staff routes (Log hours, view their own)
router.post('/', logHoursRules, timesheetController.logHours);
router.get('/', timesheetController.getTimesheets);

// Executive/Manager routes (Approve, reject, get financials)
router.patch('/:id/approve', approveTimesheetRules, timesheetController.updateStatus);
// Aggregates every approved timesheet row — see rateLimit.middleware.js.
router.get('/financials', reportLimiter, timesheetController.getFinancials);

module.exports = router;
