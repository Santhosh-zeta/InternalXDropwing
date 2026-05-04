const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, login, verifyOtp, forgotPassword, resetPassword, logout, getMe, googleLogin } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google-login', authLimiter, googleLogin);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

module.exports = router;
