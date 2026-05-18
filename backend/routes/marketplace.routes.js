const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getListings } = require('../controllers/loan.controller');

// Public marketplace — viewable without login
router.get('/listings', getListings);

// Protected — requires login to invest (handled in lender routes)
router.get('/listings/:id', authenticate, async (req, res, next) => {
  try {
    const { query } = require('../config/db');
    const result = await query(
      `SELECT ll.*, la.purpose, la.purpose_detail, la.currency,
              u.country AS borrower_country,
              bp.employment_status, bp.risk_grade
       FROM loan_listings ll
       JOIN loan_applications la ON la.id = ll.application_id
       JOIN users u ON u.id = la.borrower_id
       LEFT JOIN borrower_profiles bp ON bp.user_id = la.borrower_id
       WHERE ll.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Listing not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;