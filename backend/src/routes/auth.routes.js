const express = require('express');
const router = express.Router();
const { register, login, verifyOtp, forgotPassword, resetPassword, logout, getMe, googleLogin } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.post('/verify-otp', verifyOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

module.exports = router;
