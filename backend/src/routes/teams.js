const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { getTeams, getTeamById, createTeam, updateTeam, addTeamMember, removeTeamMember } = require('../controllers/teamController');

router.use(authenticate);

router.get('/', getTeams);
router.get('/:id', getTeamById);
router.post('/', requireRole('managing_director', 'admin', 'ceo'), createTeam);
router.put('/:id', requireRole('managing_director', 'admin', 'ceo', 'manager'), updateTeam);
router.post('/:id/members', requireRole('managing_director', 'admin', 'ceo', 'manager'), addTeamMember);
router.delete('/:id/members/:userId', requireRole('managing_director', 'admin', 'ceo', 'manager'), removeTeamMember);

module.exports = router;
