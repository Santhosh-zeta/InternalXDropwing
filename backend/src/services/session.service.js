const crypto = require('crypto');
const { pool } = require('../config/database');
const realtime = require('./realtime');

/**
 * Server-side session records, so that logging out actually revokes something.
 *
 * A JWT is self-contained: once signed it stays valid until it expires, and
 * clearing the cookie only removes one copy of it. Anything that captured the
 * token — an XSS payload, a shared machine, a proxy log — keeps working for the
 * rest of the 8 hour window. The `sessions` table turns the stateless token
 * into a revocable one: login records a row, every authenticated request checks
 * that the row is still there, and logout deletes it.
 *
 * Only the SHA-256 of the token is stored. The row is an authenticator, so a
 * leak of the table must not hand out usable tokens. SHA-256 (not bcrypt) is
 * deliberate — this is looked up on every single request, and the input is a
 * 300+ bit signed token, not a guessable password, so there is nothing for a
 * slow KDF to protect against.
 */
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Positive-result cache.
 *
 * Without it, every API request costs a round trip to Postgres before the
 * handler even starts. Entries are short-lived so a revoked token stops working
 * quickly, and logout evicts the entry in this process immediately.
 *
 * Honest limitation: with more than one Node process behind a load balancer, a
 * logout handled by process A is only guaranteed to be seen by process B after
 * the TTL below. Fifteen seconds is the residual window; set SESSION_CACHE_TTL_MS=0
 * to disable the cache entirely and check the database on every request.
 */
const CACHE_TTL_MS = process.env.SESSION_CACHE_TTL_MS !== undefined
  ? parseInt(process.env.SESSION_CACHE_TTL_MS, 10)
  : 15 * 1000;
const CACHE_MAX_ENTRIES = 5000;
const cache = new Map();

const cacheGet = (key) => {
  if (CACHE_TTL_MS <= 0) return undefined;
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expires <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
};

const cacheSet = (key, value) => {
  if (CACHE_TTL_MS <= 0) return;
  // Crude bound on memory: drop the oldest entry once the map is full. Map
  // iteration order is insertion order, so this is an approximate LRU and the
  // only cost of evicting the wrong one is an extra database lookup.
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
};

/**
 * Records a session for a freshly issued token. Called from the one place that
 * signs JWTs, so every issuance path (password + OTP, Google) is covered.
 */
const createSession = async (userId, token, expiresAt, req) => {
  const ip = req ? (req.ip || req.socket?.remoteAddress || null) : null;
  // user_agent is TEXT but there is no reason to store an unbounded header.
  const userAgent = req ? String(req.headers['user-agent'] || '').slice(0, 512) : null;

  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, hashToken(token), ip ? String(ip).slice(0, 45) : null, userAgent || null, expiresAt]
  );
};

/**
 * True when the token still has a live session row.
 *
 * `expires_at > CURRENT_TIMESTAMP` is checked in SQL as well as by the JWT
 * verification, so a row that outlives its token (clock skew, a token reissued
 * with a shorter lifetime) cannot be used to extend access.
 */
const isSessionActive = async (token) => {
  const tokenHash = hashToken(token);

  const cached = cacheGet(tokenHash);
  if (cached !== undefined) return cached;

  const [rows] = await pool.query(
    'SELECT 1 FROM sessions WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP LIMIT 1',
    [tokenHash]
  );

  const active = rows.length > 0;
  // Only cache the positive answer. A negative result is either a revoked token
  // or a forged one, and both should keep hitting the database rather than
  // being remembered — caching them would let a burst of invalid requests pin
  // entries in the map.
  if (active) cacheSet(tokenHash, true);
  return active;
};

/** Logout: drops the row and evicts the local cache entry immediately. */
const revokeSession = async (token) => {
  const tokenHash = hashToken(token);
  cache.delete(tokenHash);
  await pool.query('DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
  realtime.disconnectToken(tokenHash);
};

/** Revokes every session for a user (password change, deactivation, admin action). */
const revokeAllSessionsForUser = async (userId) => {
  cache.clear();
  await pool.query('DELETE FROM sessions WHERE user_id = ?', [userId]);
  realtime.disconnectUser(userId);
};

/**
 * Expired rows are dead weight and they are also the only copy of a user's IP
 * and user-agent history, so they should not accumulate indefinitely.
 */
const cleanupExpiredSessions = async () => {
  const [result] = await pool.query('DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP');
  return result.affectedRows || 0;
};

/**
 * Starts the periodic sweep. unref() so the timer never keeps the process alive
 * on shutdown, and the first sweep is delayed so it does not compete with boot.
 */
const startSessionCleanup = (intervalMs = 60 * 60 * 1000) => {
  const timer = setInterval(() => {
    cleanupExpiredSessions().catch(err => {
      console.error('Session cleanup failed:', err.message);
    });
  }, intervalMs);

  if (typeof timer.unref === 'function') timer.unref();
  return timer;
};

module.exports = {
  hashToken,
  createSession,
  isSessionActive,
  revokeSession,
  revokeAllSessionsForUser,
  cleanupExpiredSessions,
  startSessionCleanup,
};
