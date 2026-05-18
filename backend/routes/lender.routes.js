const express = require('express');
const router = express.Router();
const { authenticate, requireRole, requireKYC } = require('../middleware/auth');
const { getListings, invest } = require('../controllers/loan.controller');
const { query } = require('../config/db');

router.use(authenticate, requireRole('lender'));

// Profile
router.get('/profile', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.full_name, u.email, u.country, u.status, u.sa_id_number, u.province,
              lp.*,
              k.status AS kyc_status
       FROM users u
       LEFT JOIN lender_profiles lp ON lp.user_id = u.id
       LEFT JOIN kyc_verifications k ON k.user_id = u.id AND k.status = 'approved'
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

router.put('/profile', async (req, res, next) => {
  try {
    const { risk_appetite, preferred_currency } = req.body;
    await query(
      `UPDATE lender_profiles SET risk_appetite=$1, preferred_currency=$2 WHERE user_id=$3`,
      [risk_appetite, preferred_currency, req.user.id]
    );
    res.json({ message: 'Profile updated' });
  } catch (err) { next(err); }
});

// Marketplace
router.get('/marketplace', getListings);
router.post('/marketplace/:id/invest', requireKYC, invest);

// My investments
router.get('/investments', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT i.*, ll.interest_rate, ll.term_months, ll.risk_grade,
              la.purpose, la.currency, u.country AS borrower_country
       FROM investments i
       JOIN loan_listings ll ON ll.id = i.listing_id
       JOIN loan_applications la ON la.id = ll.application_id
       JOIN users u ON u.id = la.borrower_id
       WHERE i.lender_id=$1
       ORDER BY i.invested_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// Wallet top-up
router.post('/wallet/topup', requireKYC, async (req, res, next) => {
  try {
    const { amount } = req.body;
    res.json({ message: 'Top-up flow initiated', amount, currency: 'ZAR' });
  } catch (err) { next(err); }
});

module.exports = router;