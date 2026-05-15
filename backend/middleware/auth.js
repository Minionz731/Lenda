const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Verify JWT and attach user to req
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      'SELECT id, email, role, status, full_name FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (user.status === 'banned' || user.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended. Contact support.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next(err);
  }
};

/**
 * Restrict route to specific roles
 * Usage: requireRole('admin') or requireRole('borrower', 'admin')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
};

/**
 * Check KYC status before allowing sensitive actions
 */
const requireKYC = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT status FROM kyc_verifications 
       WHERE user_id = $1 AND status = 'approved' 
       ORDER BY submitted_at DESC LIMIT 1`,
      [req.user.id]
    );

    if (!result.rows.length) {
      return res.status(403).json({
        error: 'KYC verification required before this action.',
        code: 'KYC_REQUIRED',
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, requireRole, requireKYC };