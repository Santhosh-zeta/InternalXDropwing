const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getAllUsers, getUsersByVenture, getUserById, getMe,
    createUser, updateUser, deleteUser,
} = require('../controllers/userController');

router.use(authenticate);

router.get('/me', getMe);
router.get('/', requireRole('managing_director', 'admin', 'ceo'), getAllUsers);
router.get('/venture/:ventureId', requireRole('managing_director', 'admin', 'ceo'), getUsersByVenture);
router.get('/:id', requireRole('managing_director', 'admin', 'ceo', 'manager'), getUserById);
router.post('/', requireRole('managing_director', 'admin', 'ceo'), createUser);
router.put('/:id', requireRole('managing_director', 'admin', 'ceo'), updateUser);
router.delete('/:id', requireRole('managing_director', 'admin'), deleteUser);

module.exports = router;
