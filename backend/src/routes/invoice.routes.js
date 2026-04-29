const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// Get generated invoices based on approved timesheets
router.get('/', invoiceController.getInvoices);

// Get details for a specific invoice (month + venture)
router.get('/:id', invoiceController.getInvoiceDetails);

module.exports = router;
