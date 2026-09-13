const { body, validationResult } = require('express-validator');

/**
 * Collects express-validator results and rejects the request before it reaches
 * a controller. Without this the chains below would run and be ignored.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
  });
};

/**
 * Password rule, shared by register and reset so the two can never drift apart
 * and leave a weaker way in.
 */
const passwordRule = field =>
  body(field)
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters');

const registerRules = [
  body('email').isEmail().withMessage('A valid email address is required').normalizeEmail(),
  body('fullName').trim().notEmpty().withMessage('Full name is required')
    .isLength({ max: 255 }).withMessage('Full name is too long'),
  passwordRule('password'),
  validate,
];

const loginRules = [
  body('email').isEmail().withMessage('A valid email address is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

const emailOnlyRules = [
  body('email').isEmail().withMessage('A valid email address is required').normalizeEmail(),
  validate,
];

const verifyOtpRules = [
  body('email').isEmail().withMessage('A valid email address is required').normalizeEmail(),
  body('otp').trim().isLength({ min: 4, max: 8 }).withMessage('Invalid OTP'),
  validate,
];

const resetPasswordRules = [
  body('token').trim().notEmpty().withMessage('Reset token is required'),
  passwordRule('newPassword'),
  validate,
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  emailOnlyRules,
  verifyOtpRules,
  resetPasswordRules,
};
