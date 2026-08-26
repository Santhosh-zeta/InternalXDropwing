const express = require('express');
const router = express.Router();
const strategyController = require('../controllers/strategy.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/', authenticate, strategyController.getStrategyData);

module.exports = router;
