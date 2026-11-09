const express = require('express');
const router = express.Router();
const strategyController = require('../controllers/strategy.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { withScope } = require('../utils/scope');

router.get('/', authenticate, withScope, strategyController.getStrategyData);

module.exports = router;
