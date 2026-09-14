const jwt = require('jsonwebtoken');
const { isSessionActive } = require('../services/session.service');

/**
 * Postgres "undefined_table". If the sessions table is missing the deployment
 * has not run the init scripts, which is an operator problem — failing every
 * request closed would take the whole app down for a configuration drift an
 * attacker cannot cause. We log loudly and keep serving on the JWT alone.
 */
const UNDEFINED_TABLE = '42P01';

const authenticate = async (req, res, next) => {
  // Check header or cookie
  let token = req.cookies?.internalx_token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  /**
   * A valid signature is not enough: the token must also still have a session
   * row. This is what makes POST /api/auth/logout mean something — see
   * services/session.service.js for why the lookup is cheap.
   */
  try {
    const active = await isSessionActive(token);
    if (!active) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  } catch (err) {
    if (err.code === UNDEFINED_TABLE) {
      console.error('sessions table is missing — session revocation is NOT in effect. Run deployment/postgres/init scripts.');
    } else {
      // Any other failure means we genuinely cannot tell whether this token was
      // revoked, and the safe answer to "I do not know" is no.
      console.error('Session check failed:', err.message);
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  }

  req.user = decoded;
  // Handlers that need to revoke the caller's own session (logout) get the raw
  // token here rather than re-parsing the request.
  req.authToken = token;
  next();
};

const requireLevel = (...levels) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    // Lower number = higher access
    const userLevel = req.user.accessLevel;
    if (levels.includes(userLevel) || levels.some(l => userLevel <= l)) {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Insufficient access level' });
  };
};

module.exports = { authenticate, requireLevel };
