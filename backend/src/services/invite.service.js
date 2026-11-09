/**
 * Invite = a password-reset token with a longer life (72 h). The invited user
 * opens /reset-password?token=..., chooses a password and is in. Only the
 * SHA-256 of the token is stored (same machinery as forgot-password).
 *
 * The link is emailed. If SMTP is not configured (or sending fails) the caller
 * gets the link back to hand over manually. It is never logged.
 */
const crypto = require('crypto');
const { pool } = require('../config/database');
const { generateResetToken } = require('../utils/otp');
const { isEmailConfigured, sendInviteEmail } = require('./email.service');

const INVITE_TTL_MS = 72 * 60 * 60 * 1000;

/** Frontend base URL for links in emails (no trailing slash). */
const appUrl = () => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

/**
 * Store a fresh invite token for the user and deliver it.
 * @returns {{ emailed: boolean, expiresAt: Date, link?: string }}  link only when it could not be emailed
 */
const issueInvite = async (user, invitedByName) => {
  const token = generateResetToken();
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  await pool.query(
    'UPDATE users SET reset_password_token = ?, reset_password_expires_at = ? WHERE id = ?',
    [hashed, expiresAt, user.id]
  );
  const link = `${appUrl()}/reset-password?token=${token}&invite=1`;

  let emailed = false;
  if (isEmailConfigured()) {
    const result = await sendInviteEmail(user.email, user.full_name, link, invitedByName || 'An administrator');
    emailed = Boolean(result && result.success);
  }
  return emailed ? { emailed, expiresAt } : { emailed, expiresAt, link };
};

module.exports = { issueInvite, INVITE_TTL_MS };
