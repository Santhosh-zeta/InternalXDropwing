const express = require('express');
const router = express.Router();
const { register, login, verifyOtp, forgotPassword, resetPassword, logout, getMe, googleLogin } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { loginLimiter, accountLimiter, perEmailLimiter, authLimiter } = require('../middleware/rateLimit.middleware');
const {
  registerRules,
  loginRules,
  emailOnlyRules,
  verifyOtpRules,
  resetPasswordRules,
} = require('../middleware/validate.middleware');

// Ceiling over the whole unauthenticated auth surface.
router.use(authLimiter);

router.post('/register', accountLimiter, registerRules, register);
router.post('/login', loginLimiter, perEmailLimiter, loginRules, login);
router.post('/google-login', loginLimiter, googleLogin);
router.post('/verify-otp', loginLimiter, verifyOtpRules, verifyOtp);
router.post('/forgot-password', accountLimiter, perEmailLimiter, emailOnlyRules, forgotPassword);
router.post('/reset-password', accountLimiter, resetPasswordRules, resetPassword);

router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

module.exports = router;
