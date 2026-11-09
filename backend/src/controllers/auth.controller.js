const { pool } = require('../config/database');
const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { generateOTP, generateResetToken, hashOTP, verifyOTP } = require('../utils/otp');
const { sendOTPEmail, sendPasswordResetEmail } = require('../services/email.service');
const { createSession, revokeSession } = require('../services/session.service');
const { isAllowedEmailDomain } = require('../utils/emailDomains');

const generateAuthResponse = async (user, res, message, req) => {
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      accessLevel: user.access_level,
      levelName: user.level_name,
      ventureId: user.venture_id,
      ventureSlug: user.venture_slug,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  /**
   * Record the session before the token reaches the client. This is the only
   * place that signs a JWT, so every sign-in path lands here and no token can
   * escape without a revocable row behind it. The expiry is read back off the
   * signed token rather than recomputed, so the row and the token can never
   * disagree about when access ends.
   */
  const { exp } = jwt.decode(token);
  await createSession(user.id, token, new Date(exp * 1000), req);

  res.cookie('internalx_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  });

  return res.json({
    success: true,
    message,
    data: {
      token,
      user: {
        id: user.id,
        employeeId: user.employee_id,
        fullName: user.full_name,
        email: user.email,
        accessLevel: user.access_level,
        levelName: user.level_name,
        department: user.department,
        designation: user.designation,
        avatarUrl: user.avatar_url,
        venture: user.venture_id ? {
          id: user.venture_id,
          name: user.venture_name,
          slug: user.venture_slug,
          primaryColor: user.primary_color,
        } : null,
      },
    },
  });
};

/**
 * POST /api/auth/login
 * Step 1 of 2FA: Verify credentials and send OTP (if not verified yet).
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.*, al.level_name, v.name AS venture_name, v.slug AS venture_slug, v.primary_color
       FROM users u
       JOIN access_levels al ON u.access_level = al.level_number
       LEFT JOIN ventures v ON u.venture_id = v.id
       WHERE u.email = ? AND u.is_active = TRUE`,
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate OTP and send via email (2FA)
    const otp = generateOTP();
    // 10 minutes expiry
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Only the hash is persisted — the cleartext OTP exists solely in the email
    // we are about to send. See utils/otp.js for why it is an HMAC.
    await pool.query(
      'UPDATE users SET otp = ?, otp_expires_at = ? WHERE id = ?',
      [hashOTP(otp), otpExpiresAt, user.id]
    );

    // Send OTP via email. The result used to be discarded entirely, so a
    // misconfigured or absent SMTP setup (the default in a fresh checkout —
    // backend/.env.example ships SMTP_* blank) failed completely silently:
    // the API still claimed "OTP sent" and the user was stuck with a code
    // that reached nobody and no way to find out why.
    const emailResult = await sendOTPEmail(user.email, user.full_name, otp);
    if (!emailResult.success) {
      console.error(`[Auth] OTP email to ${user.email} failed to send: ${emailResult.error?.message || emailResult.error}`);
      // Never do this in production — printing an OTP anywhere but the
      // recipient's inbox defeats the point of it. In development it is the
      // difference between a working local setup and one silently stuck at
      // step 2 of login with no email server to blame.
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Auth] SMTP is not configured — using the console as the OTP channel for local development.\n[Auth] OTP for ${user.email}: ${otp}`);
      }
    }

    return res.json({
      success: true,
      requiresOTP: true,
      message: 'OTP sent to your email address',
      data: {
        email: user.email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

/**
 * POST /api/auth/verify-otp
 * Step 2 of 2FA: Verify OTP and issue JWT.
 */
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.*, al.level_name, v.name AS venture_name, v.slug AS venture_slug, v.primary_color
       FROM users u
       JOIN access_levels al ON u.access_level = al.level_number
       LEFT JOIN ventures v ON u.venture_id = v.id
       WHERE u.email = ? AND u.is_active = TRUE`,
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid request' });
    }

    const user = rows[0];

    // Constant-time compare against the stored hash, so the number of matching
    // leading digits cannot be read off the response latency.
    const otpExpired = !user.otp_expires_at || new Date() > new Date(user.otp_expires_at);
    if (otpExpired || !verifyOTP(otp, user.otp)) {
      return res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Mark as verified, clear OTP and update last login
    await pool.query(
      'UPDATE users SET is_verified = TRUE, otp = NULL, otp_expires_at = NULL, last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    return await generateAuthResponse(user, res, 'Account verified and login successful', req);
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ success: false, message: 'Server error during OTP verification' });
  }
};

/**
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, email FROM users WHERE email = ? AND is_active = TRUE',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      // Return success even if not found for security (prevent email enumeration)
      return res.json({ success: true, message: 'If that email address is in our database, we will send you an email to reset your password.' });
    }

    const user = rows[0];
    const resetToken = generateResetToken();
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await pool.query(
      'UPDATE users SET reset_password_token = ?, reset_password_expires_at = ? WHERE id = ?',
      [hashedToken, expiresAt, user.id]
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const emailResult = await sendPasswordResetEmail(user.email, user.full_name, resetUrl);
    if (!emailResult.success) {
      console.error(`[Auth] Password reset email to ${user.email} failed to send: ${emailResult.error?.message || emailResult.error}`);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Auth] SMTP is not configured — using the console as the email channel for local development.\n[Auth] Reset link for ${user.email}: ${resetUrl}`);
      }
    }

    return res.json({ success: true, message: 'If that email address is in our database, we will send you an email to reset your password.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ success: false, message: 'Server error during password reset request' });
  }
};

/**
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ success: false, message: 'Token and new password are required' });
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const [rows] = await pool.query(
      'SELECT id FROM users WHERE reset_password_token = ? AND reset_password_expires_at > CURRENT_TIMESTAMP AND is_active = TRUE',
      [hashedToken]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const user = rows[0];
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await pool.query(
      'UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires_at = NULL WHERE id = ?',
      [newPasswordHash, user.id]
    );

    return res.json({ success: true, message: 'Password successfully reset' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ success: false, message: 'Server error during password reset' });
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  /**
   * Clearing the cookie only removes the browser's copy. Deleting the session
   * row is what stops the token itself from working — including the copy the
   * mobile client holds in its keychain and any copy an attacker captured.
   */
  try {
    if (req.authToken) await revokeSession(req.authToken);
  } catch (err) {
    // A failure here means the token stays live until it expires, which the
    // user needs to know about rather than being told they are safely out.
    console.error('Session revocation failed:', err.message);
    res.clearCookie('internalx_token');
    return res.status(500).json({ success: false, message: 'Could not fully sign out. Please try again.' });
  }

  res.clearCookie('internalx_token');
  return res.json({ success: true, message: 'Logged out successfully' });
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.employee_id, u.full_name, u.email, u.access_level, u.department,
              u.designation, u.phone, u.avatar_url, u.last_login, u.created_at,
              al.level_name,
              v.id AS venture_id, v.name AS venture_name, v.slug AS venture_slug, v.primary_color
       FROM users u
       JOIN access_levels al ON u.access_level = al.level_number
       LEFT JOIN ventures v ON u.venture_id = v.id
       WHERE u.id = ? AND u.is_active = TRUE`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = rows[0];
    return res.json({
      success: true,
      data: {
        id: user.id,
        employeeId: user.employee_id,
        fullName: user.full_name,
        email: user.email,
        accessLevel: user.access_level,
        levelName: user.level_name,
        department: user.department,
        designation: user.designation,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        venture: user.venture_id ? {
          id: user.venture_id,
          name: user.venture_name,
          slug: user.venture_slug,
          primaryColor: user.primary_color,
        } : null,
      },
    });
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/auth/register
 */
const register = async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
  }

  if (!isAllowedEmailDomain(email)) {
    return res.status(403).json({
      success: false,
      message: 'Registration is restricted to Dropwing Groups team members. Please contact your admin.'
    });
  }

  try {
    // Check if user exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    // Generate a default employee_id since it's unique
    const employeeId = 'EMP-' + crypto.randomBytes(3).toString('hex').toUpperCase();

    await pool.query(
      `INSERT INTO users (employee_id, full_name, email, password_hash, access_level) 
       VALUES (?, ?, ?, ?, 8)`,
      [employeeId, fullName, email.toLowerCase().trim(), passwordHash]
    );

    return res.status(201).json({ success: true, message: 'Registration successful! You can now log in.' });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

/**
 * POST /api/auth/google-login
 *
 * Invite-only. Google proves who owns an email address; it never decides what
 * that person may do. So: the Google token must be valid for OUR client id, the
 * email must be verified by Google and on the allowed-domain list, and a user
 * row must ALREADY exist (created by an admin or by registration) and be
 * active. No account is ever created here, so this path can never mint a
 * privileged (or any) account.
 */
const googleLogin = async (req, res) => {
  const { credential } = req.body;

  if (!credential || typeof credential !== 'string') {
    return res.status(400).json({ success: false, message: 'Google credential is required' });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    // With no audience configured verifyIdToken would accept a token minted
    // for ANY Google client, so refuse outright.
    return res.status(503).json({ success: false, message: 'Google sign-in is not configured on this server' });
  }

  try {
    const googleClient = new OAuth2Client(clientId);
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      return res.status(401).json({ success: false, message: 'Google sign-in failed' });
    }

    const email = String(payload?.email || '').toLowerCase().trim();
    if (!email || payload.email_verified !== true) {
      return res.status(401).json({ success: false, message: 'Your Google email address is not verified' });
    }
    if (!isAllowedEmailDomain(email)) {
      return res.status(403).json({ success: false, message: 'Sign-in is restricted to Dropwing Groups team members.' });
    }

    const [rows] = await pool.query(
      `SELECT u.*, al.level_name, v.name AS venture_name, v.slug AS venture_slug, v.primary_color
       FROM users u
       JOIN access_levels al ON u.access_level = al.level_number
       LEFT JOIN ventures v ON u.venture_id = v.id
       WHERE u.email = ? AND u.is_active = TRUE`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'No account exists for this Google address. Ask your administrator to invite you first.',
      });
    }

    const user = rows[0];
    await pool.query(
      `UPDATE users SET is_verified = TRUE, last_login = CURRENT_TIMESTAMP,
              avatar_url = COALESCE(avatar_url, ?) WHERE id = ?`,
      [payload.picture || null, user.id]
    );
    user.is_verified = true;
    return await generateAuthResponse(user, res, 'Google login successful', req);
  } catch (err) {
    console.error('Google login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during Google login' });
  }
};

module.exports = { register, login, verifyOtp, forgotPassword, resetPassword, logout, getMe, googleLogin };
