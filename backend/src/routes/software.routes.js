const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { withScope, atLeast } = require('../utils/scope');
const {
  getEpics, createEpic, updateEpic, deleteEpic,
  getSprints, createSprint, updateSprint, getSprintRetros, createSprintRetro,
  getReleases, createRelease, updateRelease,
  getSoftwareIssues, createSoftwareIssue, updateSoftwareIssue,
  getIssueComments, addIssueComment,
  getSoftwareMetrics
} = require('../controllers/software.controller');

router.use(authenticate, withScope);

// Epics (Requirements & PRDs)
router.get('/epics', getEpics);
router.post('/epics', atLeast(7), createEpic);
router.put('/epics/:id', atLeast(7), updateEpic);
router.delete('/epics/:id', atLeast(5), deleteEpic);

// Sprints & Retrospectives
router.get('/sprints', getSprints);
router.post('/sprints', atLeast(7), createSprint);
router.put('/sprints/:id', atLeast(7), updateSprint);
router.get('/sprints/:id/retro', getSprintRetros);
router.post('/sprints/:id/retro', atLeast(8), createSprintRetro);

// Releases & Versions
router.get('/releases', getReleases);
router.post('/releases', atLeast(7), createRelease);
router.put('/releases/:id', atLeast(7), updateRelease);

// Software Issues (Stories, Bugs, Tasks)
router.get('/issues', getSoftwareIssues);
router.post('/issues', atLeast(7), createSoftwareIssue);
router.put('/issues/:id', atLeast(7), updateSoftwareIssue);

// Comments
router.get('/issues/:id/comments', getIssueComments);
router.post('/issues/:id/comments', atLeast(8), addIssueComment);

// Analytics
router.get('/metrics', getSoftwareMetrics);

module.exports = router;
