const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { 
    getTasks, createTask, updateTask, deleteTask, 
    getTaskComments, addTaskComment, getTaskActivity,
    getTaskFiles, attachFileMetadata, deleteTaskFile
} = require('../controllers/taskController');
const { getTaskApprovals, requestApproval, resolveApproval } = require('../controllers/approvalController');

router.use(authenticate);

router.get('/', getTasks);
router.post('/', requireRole('managing_director', 'ceo', 'manager'), createTask);
router.put('/:id', updateTask);
router.delete('/:id', requireRole('managing_director', 'ceo', 'manager'), deleteTask);

// Sub-resources
router.get('/:id/comments', getTaskComments);
router.post('/:id/comments', addTaskComment);
router.get('/:id/activity', getTaskActivity);

// Approvals (Phase 3)
router.get('/:id/approvals', getTaskApprovals);
router.post('/:id/approvals', requestApproval);
router.put('/:id/approvals/:approvalId', requireRole('managing_director', 'ceo', 'manager'), resolveApproval);

// Files (Phase 3)
router.get('/:id/files', getTaskFiles);
router.post('/:id/files', attachFileMetadata);
router.delete('/:id/files/:fileId', deleteTaskFile);

module.exports = router;

