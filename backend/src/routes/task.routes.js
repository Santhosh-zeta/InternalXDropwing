const express = require('express');
const router = express.Router();
const { getTasks, getTaskById, createTask, updateTask, deleteTask } = require('../controllers/task.controller');
const { authenticate, requireLevel } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', getTasks);
router.get('/:id', getTaskById);
router.post('/', requireLevel(7), createTask);
router.put('/:id', requireLevel(7), updateTask);
router.delete('/:id', requireLevel(5), deleteTask);

module.exports = router;
