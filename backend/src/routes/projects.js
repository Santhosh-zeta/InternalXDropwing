const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { getProjects, createProject, updateProject, assignClient } = require('../controllers/projectController');

router.use(authenticate);

router.get('/', getProjects);
router.post('/', requireRole('managing_director', 'ceo'), createProject);
router.put('/:id', requireRole('managing_director', 'ceo'), updateProject);
router.post('/:id/clients', requireRole('managing_director', 'ceo'), assignClient);

module.exports = router;
