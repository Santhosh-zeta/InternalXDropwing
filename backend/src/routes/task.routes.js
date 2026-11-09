const express = require('express');
const router = express.Router();
const { getTasks, getTaskById, createTask, updateTask, deleteTask } = require('../controllers/task.controller');
const { authenticate, requireLevel } = require('../middleware/auth.middleware');
const { withScope } = require('../utils/scope');
const { createTaskRules, updateTaskRules, taskIdRules } = require('../middleware/validate.middleware');

router.use(authenticate, withScope);

router.get('/', getTasks);  // clients get their deliverables only (see taskWhere)
router.get('/:id', taskIdRules, getTaskById);
router.post('/', requireLevel(7), createTaskRules, createTask);
router.put('/:id', requireLevel(7), updateTaskRules, updateTask);
router.delete('/:id', requireLevel(5), taskIdRules, deleteTask);

module.exports = router;
