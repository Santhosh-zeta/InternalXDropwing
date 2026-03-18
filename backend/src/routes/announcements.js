const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { getAnnouncements, createAnnouncement, deleteAnnouncement } = require('../controllers/announcementController');

router.use(authenticate);

router.get('/', getAnnouncements);
router.post('/', requireRole('managing_director', 'ceo', 'manager'), createAnnouncement);
router.delete('/:id', requireRole('managing_director', 'ceo', 'manager'), deleteAnnouncement);

module.exports = router;
