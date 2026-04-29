const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
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

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
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
