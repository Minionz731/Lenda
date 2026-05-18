const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/db');

// GET /api/payments/history — transaction history for logged in user
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/payments/application-fee — record application fee payment
router.post('/application-fee', authenticate, async (req, res, next) => {
  try {
    const { amount, reference_id, provider_ref, provider } = req.body;
    await query(
      `INSERT INTO transactions (user_id, type, amount, currency, direction, reference_id, reference_type, provider, provider_ref, status, description)
       VALUES ($1, 'application_fee', $2, 'ZAR', 'debit', $3, 'loan_application', $4, $5, 'completed', 'Loan application fee')`,
      [req.user.id, amount, reference_id, provider || 'ozow', provider_ref]
    );
    res.json({ message: 'Application fee recorded' });
  } catch (err) { next(err); }
});

// POST /api/payments/webhook/ozow — Ozow payment notification
router.post('/webhook/ozow', async (req, res, next) => {
  try {
    // Verify webhook and update transaction status
    // Full implementation requires Ozow hash verification (see ozow.service.js)
    console.log('Ozow webhook received:', req.body);
    res.json({ message: 'Webhook received' });
  } catch (err) { next(err); }
});

// POST /api/payments/webhook/stitch — Stitch payment notification
router.post('/webhook/stitch', async (req, res, next) => {
  try {
    console.log('Stitch webhook received:', req.body);
    res.json({ message: 'Webhook received' });
  } catch (err) { next(err); }
});

module.exports = router;