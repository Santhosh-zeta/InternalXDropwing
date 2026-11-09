const express = require('express');
const router = express.Router();
const { publicConfig, register, login, verifyOtp, forgotPassword, resetPassword, logout, getMe, googleLogin } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { loginLimiter, accountLimiter, perEmailLimiter, authLimiter, apiLimiter } = require('../middleware/rateLimit.middleware');
const {
  registerRules,
  loginRules,
  emailOnlyRules,
  verifyOtpRules,
  resetPasswordRules,
} = require('../middleware/validate.middleware');

// Signed-in endpoints sit BEFORE the per-IP ceiling below: every page load calls
// /me, so an office behind one NAT must not share a 100-request budget with them.
// apiLimiter keys on the verified user id (IP only for anonymous callers).
router.post('/logout', apiLimiter, authenticate, logout);
router.get('/me', apiLimiter, authenticate, getMe);

// Ceiling over the whole unauthenticated auth surface.
router.use(authLimiter);

router.get('/config', publicConfig);
router.post('/register', accountLimiter, registerRules, register);
router.post('/login', loginLimiter, perEmailLimiter, loginRules, login);
router.post('/google-login', loginLimiter, googleLogin);
router.post('/verify-otp', loginLimiter, verifyOtpRules, verifyOtp);
router.post('/forgot-password', accountLimiter, perEmailLimiter, emailOnlyRules, forgotPassword);
router.post('/reset-password', accountLimiter, resetPasswordRules, resetPassword);

module.exports = router;
