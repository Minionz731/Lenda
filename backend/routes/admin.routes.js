const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { getAllApplications, approveApplication, rejectApplication } = require('../controllers/loan.controller');
const { getAdminKYCQueue, approveKYC, rejectKYC } = require('../controllers/kyc.controller');
const { query } = require('../config/db');

router.use(authenticate, requireRole('admin'));

// ── Users ──────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const { role, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    if (role)   { params.push(role);   conditions.push(`role = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(limit, offset);
    const r = await query(
      `SELECT id, email, full_name, role, country, status, created_at FROM users ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const c = await query(`SELECT COUNT(*) FROM users ${where}`, conditions.length ? params.slice(0, -2) : []);
    res.json({ data: r.rows, total: parseInt(c.rows[0].count), page: parseInt(page) });
  } catch (err) { next(err); }
});

router.get('/users/:id', async (req, res, next) => {
  try {
    const r = await query(`SELECT * FROM users WHERE id = $1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

router.put('/users/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    await query(`UPDATE users SET status = $1 WHERE id = $2`, [status, req.params.id]);
    await query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, new_value) VALUES ($1,'update_user_status','user',$2,$3)`,
      [req.user.id, req.params.id, JSON.stringify({ status })]
    );
    res.json({ message: `User status updated to ${status}` });
  } catch (err) { next(err); }
});

// ── Loans ──────────────────────────────────
router.get('/loans', getAllApplications);
router.put('/loans/:id/approve', approveApplication);
router.put('/loans/:id/reject', rejectApplication);
router.put('/loans/:id/review', async (req, res, next) => {
  try {
    await query(
      `UPDATE loan_applications SET status = 'under_review', reviewed_by = $1 WHERE id = $2`,
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Marked as under review' });
  } catch (err) { next(err); }
});

// ── KYC ────────────────────────────────────
router.get('/kyc', getAdminKYCQueue);
router.put('/kyc/:id/approve', approveKYC);
router.put('/kyc/:id/reject', rejectKYC);

// ── Analytics ──────────────────────────────
router.get('/analytics', async (req, res, next) => {
  try {
    const [users, loans, funds, fees] = await Promise.all([
      query(`SELECT role, COUNT(*) FROM users GROUP BY role`),
      query(`SELECT status, COUNT(*) FROM loan_applications GROUP BY status`),
      query(`SELECT COALESCE(SUM(amount_funded), 0) AS total FROM loan_listings`),
      query(`SELECT COALESCE(SUM(amount), 0) AS total FROM platform_fees WHERE status = 'paid'`),
    ]);
    res.json({
      users: users.rows,
      loans: loans.rows,
      total_funded: parseFloat(funds.rows[0].total),
      total_fees: parseFloat(fees.rows[0].total),
    });
  } catch (err) { next(err); }
});

module.exports = router;