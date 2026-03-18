const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { getVentures, getVentureById, createVenture, updateVenture } = require('../controllers/companyController');

router.use(authenticate);

router.get('/', requireRole('managing_director', 'admin', 'ceo'), getVentures);
router.get('/:id', requireRole('managing_director', 'admin', 'ceo'), getVentureById);
router.post('/', requireRole('managing_director', 'admin'), createVenture);
router.put('/:id', requireRole('managing_director', 'admin'), updateVenture);

module.exports = router;
