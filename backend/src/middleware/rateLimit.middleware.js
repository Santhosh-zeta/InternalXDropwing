const rateLimit = require('express-rate-limit');

/**
 * Rate limiters for the unauthenticated surface.
 *
 * Everything below /api/auth is reachable without a token, which makes it the
 * only part of the API an attacker can hammer for free — credential stuffing on
 * /login, user enumeration on /forgot-password, OTP brute force on /verify-otp.
 * Limits are keyed on IP; the app sets `trust proxy` so the client IP survives
 * the Cloudflare Tunnel in front of it.
 *
 * Disabled in the test environment so suites don't trip over their own volume.
 */
const disabled = process.env.NODE_ENV === 'test';

const shared = {
  standardHeaders: true,   // RateLimit-* response headers
  legacyHeaders: false,    // no X-RateLimit-*
  skip: () => disabled,
  handler: (req, res) =>
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please wait a few minutes and try again.',
    }),
};

/**
 * Login and OTP verification: the endpoints where a correct guess is worth the
 * most. Successful requests don't count, so a legitimate user who signs in
 * repeatedly is never locked out — only failures accumulate.
 */
const loginLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
});

/**
 * Account creation and password reset. These send email, so the cost of abuse
 * lands on our SMTP reputation as well as the database.
 */
const accountLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: 5,
});

/**
 * A ceiling over the whole auth router, so an endpoint added later is covered
 * by something even if nobody remembers to give it a specific limiter.
 */
const authLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 100,
});

module.exports = { loginLimiter, accountLimiter, authLimiter };
