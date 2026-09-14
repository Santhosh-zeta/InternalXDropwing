const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { invoiceIdRules } = require('../middleware/validate.middleware');
const { reportLimiter } = require('../middleware/rateLimit.middleware');

router.use(authenticate);

// Get generated invoices based on approved timesheets
router.get('/', reportLimiter, invoiceController.getInvoices);

// Get details for a specific invoice (month + venture)
router.get('/:id', reportLimiter, invoiceIdRules, invoiceController.getInvoiceDetails);

module.exports = router;
