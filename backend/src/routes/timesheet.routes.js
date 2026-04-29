const express = require('express');
const router = express.Router();
const timesheetController = require('../controllers/timesheet.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// Staff routes (Log hours, view their own)
router.post('/', timesheetController.logHours);
router.get('/', timesheetController.getTimesheets);

// Executive/Manager routes (Approve, reject, get financials)
router.patch('/:id/approve', timesheetController.updateStatus);
router.get('/financials', timesheetController.getFinancials);

module.exports = router;
