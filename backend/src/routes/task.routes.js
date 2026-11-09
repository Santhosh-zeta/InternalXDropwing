const express = require('express');
const router = express.Router();
const { getTasks, getTaskById, createTask, updateTask, deleteTask } = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { withScope, atLeast } = require('../utils/scope');
const { createTaskRules, updateTaskRules, taskIdRules } = require('../middleware/validate.middleware');

router.use(authenticate, withScope);

router.get('/', getTasks);  // clients get their deliverables only (see taskWhere)
router.get('/:id', taskIdRules, getTaskById);
router.post('/', atLeast(7), createTaskRules, createTask);
router.put('/:id', atLeast(7), updateTaskRules, updateTask);
router.delete('/:id', atLeast(5), taskIdRules, deleteTask);

module.exports = router;
