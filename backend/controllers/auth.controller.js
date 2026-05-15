const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/db');

const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { userId, role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { email, password, full_name, role, country, phone } = req.body;

    // Validate role
    if (!['borrower', 'lender'].includes(role)) {
      return res.status(400).json({ error: 'Role must be borrower or lender' });
    }

    // Check existing user
    const exists = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await transaction(async (client) => {
      // Create user
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, country, phone, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending_kyc') RETURNING id, email, role, full_name`,
        [email.toLowerCase(), passwordHash, full_name, role, country, phone]
      );
      const user = userResult.rows[0];

      // Create role profile
      if (role === 'borrower') {
        await client.query(
          'INSERT INTO borrower_profiles (user_id) VALUES ($1)',
          [user.id]
        );
      } else if (role === 'lender') {
        await client.query(
          'INSERT INTO lender_profiles (user_id) VALUES ($1)',
          [user.id]
        );
      }

      // Welcome notification
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, 'Welcome to LendFlow!', 'Your account is created. Complete KYC to get started.', 'info')`,
        [user.id]
      );

      const { accessToken, refreshToken } = generateTokens(user.id, user.role);

      res.status(201).json({
        message: 'Account created successfully',
        user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
        accessToken,
        refreshToken,
      });
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT id, email, password_hash, role, status, full_name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (user.status === 'banned') {
      return res.status(403).json({ error: 'Account has been banned. Contact support.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);

    res.json({
      user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name, status: user.status },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId, decoded.role);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.country, u.phone, u.status, u.created_at,
              k.status AS kyc_status
       FROM users u
       LEFT JOIN kyc_verifications k ON k.user_id = u.id AND k.status = 'approved'
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refreshToken, getMe, changePassword };