const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { getProjects, getProjectById, createProject, updateProject, assignClient, assignTeam, removeTeam } = require('../controllers/projectController');

router.use(authenticate);

router.get('/',    getProjects);
router.get('/:id', getProjectById);
router.post('/',   requireRole('managing_director', 'ceo', 'manager'), createProject);
router.put('/:id', requireRole('managing_director', 'ceo', 'manager'), updateProject);

// Client assignment
router.post('/:id/clients', requireRole('managing_director', 'ceo', 'manager'), assignClient);

// Team assignment to project
router.post('/:id/teams',         requireRole('managing_director', 'ceo', 'manager'), assignTeam);
router.delete('/:id/teams/:teamId', requireRole('managing_director', 'ceo', 'manager'), removeTeam);

module.exports = router;
