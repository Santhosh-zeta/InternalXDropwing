const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { getTasks, createTask, updateTask, deleteTask } = require('../controllers/taskController');

router.use(authenticate);

router.get('/', getTasks);
router.post('/', requireRole('managing_director', 'ceo', 'manager'), createTask);
router.put('/:id', updateTask);
router.delete('/:id', requireRole('managing_director', 'ceo', 'manager'), deleteTask);

module.exports = router;
