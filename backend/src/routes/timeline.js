const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getTimeline } = require('../controllers/timelineController');

router.use(authenticate);
router.get('/', getTimeline);

module.exports = router;
