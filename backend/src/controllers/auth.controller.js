const { pool } = require('../config/database');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { generateOTP, generateResetToken } = require('../utils/otp');
const { sendOTPEmail, sendPasswordResetEmail } = require('../services/email.service');

const generateAuthResponse = (user, res, message) => {
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
       WHERE u.email = ? AND u.is_active = 1`,
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

    // If user is already verified, log them in directly
    if (user.is_verified) {
      await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
      return generateAuthResponse(user, res, 'Login successful');
    }

    // Otherwise, generate OTP
    const otp = generateOTP();
    // 5 minutes expiry
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query(
      'UPDATE users SET otp = ?, otp_expires_at = ? WHERE id = ?',
      [otp, otpExpiresAt, user.id]
    );

    // Send OTP via email
    await sendOTPEmail(user.email, user.full_name, otp);

    return res.json({
      success: true,
      message: 'OTP sent to your email address',
      data: {
        email: user.email // Return email so frontend knows which email to verify
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
       WHERE u.email = ? AND u.is_active = 1`,
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid request' });
    }

    const user = rows[0];

    // Check if OTP matches and is not expired
    if (!user.otp || user.otp !== otp || new Date() > new Date(user.otp_expires_at)) {
      return res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Mark as verified, clear OTP and update last login
    await pool.query(
      'UPDATE users SET is_verified = 1, otp = NULL, otp_expires_at = NULL, last_login = NOW() WHERE id = ?',
      [user.id]
    );

    return generateAuthResponse(user, res, 'Account verified and login successful');
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
      'SELECT id, full_name, email FROM users WHERE email = ? AND is_active = 1',
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
    
    await sendPasswordResetEmail(user.email, user.full_name, resetUrl);

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
      'SELECT id FROM users WHERE reset_password_token = ? AND reset_password_expires_at > NOW() AND is_active = 1',
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
       WHERE u.id = ? AND u.is_active = 1`,
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
 */
const googleLogin = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ success: false, message: 'Google credential is required' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Check if user exists
    const [rows] = await pool.query(
      `SELECT u.*, al.level_name, v.name AS venture_name, v.slug AS venture_slug, v.primary_color
       FROM users u
       JOIN access_levels al ON u.access_level = al.level_number
       LEFT JOIN ventures v ON u.venture_id = v.id
       WHERE u.email = ? AND u.is_active = 1`,
      [email.toLowerCase().trim()]
    );

    let user;
    if (rows.length > 0) {
      user = rows[0];
      // Mark as verified if not already (Google users are auto-verified)
      if (!user.is_verified) {
        await pool.query('UPDATE users SET is_verified = 1 WHERE id = ?', [user.id]);
        user.is_verified = 1;
      }
    } else {
      // Create new user (Intern level 8 by default)
      const employeeId = 'EMP-G-' + crypto.randomBytes(3).toString('hex').toUpperCase();
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 12);

      const [result] = await pool.query(
        `INSERT INTO users (employee_id, full_name, email, password_hash, access_level, is_verified, avatar_url) 
         VALUES (?, ?, ?, ?, 8, 1, ?)`,
        [employeeId, name, email.toLowerCase().trim(), passwordHash, picture]
      );

      const [newUser] = await pool.query(
        `SELECT u.*, al.level_name, v.name AS venture_name, v.slug AS venture_slug, v.primary_color
         FROM users u
         JOIN access_levels al ON u.access_level = al.level_number
         LEFT JOIN ventures v ON u.venture_id = v.id
         WHERE u.id = ?`,
        [result.insertId]
      );
      user = newUser[0];
    }

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    return generateAuthResponse(user, res, 'Google login successful');
  } catch (err) {
    console.error('Google login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during Google login' });
  }
};

module.exports = { register, login, verifyOtp, forgotPassword, resetPassword, logout, getMe, googleLogin };
