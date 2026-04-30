const express = require('express');
const router = express.Router();
const strategyController = require('../controllers/strategy.controller');
// Add middleware if needed (e.g., auth)

router.get('/', strategyController.getStrategyData);

module.exports = router;
