const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const jwt = require('jsonwebtoken');

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
  // Per IP, and a whole office can share one IP, so this is a flood ceiling,
  // not the abuse control: the per-email limiter below is what stops one
  // mailbox being spammed.
  limit: 30,
});

/**
 * Per-mailbox budget for endpoints that send email (login OTP, password
 * reset), keyed on the target address so rotating IPs does not help an
 * attacker flood one victim. The unauthenticated routes see the parsed body
 * because express.json() is mounted app-wide before them.
 */
const emailKey = (req) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
  return email ? `email:${email}` : `ip:${ipKeyGenerator(req.ip)}`;
};

const perEmailLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 8,
  keyGenerator: emailKey,
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

/**
 * Key for the authenticated limiters below: the caller's user id when they
 * present a valid token, otherwise their IP.
 *
 * Keying purely on IP is what locks people out — the whole company sits behind
 * one office NAT or one Cloudflare egress, so a per-IP budget is really a
 * shared budget and the tenth person to open the dashboard gets a 429. Keying
 * on the user id gives each person their own budget.
 *
 * The token is *verified*, not just decoded: an unverified `sub` is
 * attacker-chosen, and an attacker who can pick their own bucket key can mint a
 * fresh bucket per request and bypass the limit entirely.
 *
 * ipKeyGenerator is express-rate-limit's own helper — it normalises IPv6 to a
 * /56 so an attacker with a routed v6 prefix cannot get a new bucket per
 * address.
 */
const userOrIpKey = (req) => {
  const token = req.cookies?.internalx_token ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

  if (token && process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      if (decoded?.id) return `u:${decoded.id}`;
    } catch (err) {
      // Fall through to the IP key — an invalid token is an anonymous caller.
    }
  }

  return `ip:${ipKeyGenerator(req.ip)}`;
};

/**
 * Blanket limiter for the whole /api surface.
 *
 * Sized to be invisible in normal use: a dashboard load is a couple of dozen
 * calls and the notification poller adds a few a minute, so a signed-in user
 * doing heavy work might reach the low hundreds in a quarter of an hour. 1000
 * leaves several times that headroom while still stopping a scripted scrape or
 * an enumeration sweep from running unbounded.
 */
const apiLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  keyGenerator: userOrIpKey,
});

/**
 * Uploads: each one costs a multipart parse and up to 50MB of disk. Far more
 * expensive per request than a JSON read, and nobody legitimately uploads two
 * files a minute for a quarter of an hour.
 */
const uploadLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyGenerator: userOrIpKey,
});

/**
 * Reporting and analytics: unindexed aggregates over timesheets, projects and
 * audit logs. Cheap to ask for, expensive to answer, so they are the easiest
 * lever for someone who wants to flatten the database. Still generous enough
 * for a user flipping between dashboard tabs.
 */
const reportLimiter = rateLimit({
  ...shared,
  windowMs: 5 * 60 * 1000,
  limit: 120,
  keyGenerator: userOrIpKey,
});

module.exports = {
  loginLimiter,
  accountLimiter,
  perEmailLimiter,
  authLimiter,
  apiLimiter,
  uploadLimiter,
  reportLimiter,
};
