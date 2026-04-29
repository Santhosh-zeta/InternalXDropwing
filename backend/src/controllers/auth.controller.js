const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * POST /api/auth/login
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

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // Generate JWT
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

    // Set HTTP-only cookie
    res.cookie('internalx_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    return res.json({
      success: true,
      message: 'Login successful',
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
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login' });
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

module.exports = { login, logout, getMe };
