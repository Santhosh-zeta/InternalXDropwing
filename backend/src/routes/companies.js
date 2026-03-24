const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { getCompanies, getCompanyById, createCompany, updateCompany } = require('../controllers/companyController');

router.use(authenticate);

router.get('/', requireRole('managing_director', 'admin', 'ceo'), getCompanies);
router.get('/:id', requireRole('managing_director', 'admin', 'ceo'), getCompanyById);
router.post('/', requireRole('managing_director', 'admin'), createCompany);
router.put('/:id', requireRole('managing_director', 'admin'), updateCompany);

module.exports = router;
