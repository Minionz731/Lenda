const { query, transaction } = require('../config/db');

// ─────────────────────────────────────────────
// BORROWER — Create Loan Application
// POST /api/borrower/loans
// ─────────────────────────────────────────────
const createApplication = async (req, res, next) => {
  try {
    const { amount, currency, purpose, purpose_detail, term_months } = req.body;

    const result = await query(
      `INSERT INTO loan_applications 
        (borrower_id, amount, currency, purpose, purpose_detail, term_months, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft')
       RETURNING *`,
      [req.user.id, amount, currency || 'USD', purpose, purpose_detail, term_months]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// BORROWER — Submit Application (moves draft → submitted)
// PUT /api/borrower/loans/:id/submit
// ─────────────────────────────────────────────
const submitApplication = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Confirm ownership + draft status
    const check = await query(
      `SELECT id, status FROM loan_applications WHERE id = $1 AND borrower_id = $2`,
      [id, req.user.id]
    );

    if (!check.rows.length) return res.status(404).json({ error: 'Application not found' });
    if (check.rows[0].status !== 'draft') {
      return res.status(400).json({ error: 'Application already submitted' });
    }

    // Check documents uploaded
    const docs = await query(
      'SELECT id FROM loan_documents WHERE application_id = $1',
      [id]
    );
    if (!docs.rows.length) {
      return res.status(400).json({ error: 'Please upload at least one supporting document' });
    }

    const result = await query(
      `UPDATE loan_applications 
       SET status = 'submitted', submitted_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [id]
    );

    // Notify borrower
    await query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, 'Application Submitted', 'Your loan application is under review. We will notify you within 2–3 business days.', 'loan')`,
      [req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// BORROWER — Get my applications
// GET /api/borrower/loans
// ─────────────────────────────────────────────
const getMyApplications = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT la.*, 
              (SELECT COUNT(*) FROM loan_documents ld WHERE ld.application_id = la.id) AS doc_count,
              ll.amount_funded, ll.status AS listing_status
       FROM loan_applications la
       LEFT JOIN loan_listings ll ON ll.application_id = la.id
       WHERE la.borrower_id = $1
       ORDER BY la.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// BORROWER — Get single application
// GET /api/borrower/loans/:id
// ─────────────────────────────────────────────
const getApplication = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT la.*, 
              json_agg(DISTINCT ld.*) FILTER (WHERE ld.id IS NOT NULL) AS documents,
              row_to_json(ll.*) AS listing,
              json_agg(DISTINCT rs.*) FILTER (WHERE rs.id IS NOT NULL) AS repayment_schedule
       FROM loan_applications la
       LEFT JOIN loan_documents ld ON ld.application_id = la.id
       LEFT JOIN loan_listings ll ON ll.application_id = la.id
       LEFT JOIN repayment_schedule rs ON rs.application_id = la.id
       WHERE la.id = $1 AND la.borrower_id = $2
       GROUP BY la.id, ll.id`,
      [req.params.id, req.user.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Application not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// ADMIN — Get all applications
// GET /api/admin/loans?status=submitted&page=1
// ─────────────────────────────────────────────
const getAllApplications = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [limit, offset];

    if (status) {
      whereClause = 'WHERE la.status = $3';
      params.push(status);
    }

    const result = await query(
      `SELECT la.*, 
              u.full_name AS borrower_name, u.email AS borrower_email, u.country,
              bp.monthly_income, bp.employment_status, bp.risk_grade
       FROM loan_applications la
       JOIN users u ON u.id = la.borrower_id
       LEFT JOIN borrower_profiles bp ON bp.user_id = la.borrower_id
       ${whereClause}
       ORDER BY la.submitted_at DESC NULLS LAST, la.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM loan_applications la ${whereClause}`,
      status ? [status] : []
    );

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// ADMIN — Approve loan application
// PUT /api/admin/loans/:id/approve
// ─────────────────────────────────────────────
const approveApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { interest_rate, admin_notes } = req.body;

    await transaction(async (client) => {
      // Update application
      const appResult = await client.query(
        `UPDATE loan_applications 
         SET status = 'approved', interest_rate = $1, admin_notes = $2,
             reviewed_by = $3, reviewed_at = NOW()
         WHERE id = $4 AND status IN ('submitted', 'under_review')
         RETURNING *`,
        [interest_rate, admin_notes, req.user.id, id]
      );

      if (!appResult.rows.length) {
        throw { status: 404, message: 'Application not found or already processed' };
      }

      const app = appResult.rows[0];

      // Calculate monthly payment (simple interest formula)
      const monthlyRate = (interest_rate / 100) / 12;
      const n = app.term_months;
      const monthly = monthlyRate > 0
        ? (app.amount * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
        : app.amount / n;

      await client.query(
        'UPDATE loan_applications SET monthly_payment = $1 WHERE id = $2',
        [monthly.toFixed(2), id]
      );

      // Create marketplace listing
      await client.query(
        `INSERT INTO loan_listings (application_id, amount_needed, interest_rate, term_months, risk_grade, status, expires_at)
         VALUES ($1, $2, $3, $4, 
           (SELECT risk_grade FROM borrower_profiles WHERE user_id = $5),
           'open', NOW() + INTERVAL '30 days')`,
        [id, app.amount, interest_rate, app.term_months, app.borrower_id]
      );

      // Update app status to 'listed'
      await client.query(
        `UPDATE loan_applications SET status = 'listed' WHERE id = $1`,
        [id]
      );

      // Notify borrower
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, '🎉 Loan Approved!', 'Your loan application has been approved and listed on the marketplace at ${interest_rate}% p.a.', 'success')`,
        [app.borrower_id]
      );
    });

    res.json({ message: 'Application approved and listed on marketplace' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// ADMIN — Reject loan application
// PUT /api/admin/loans/:id/reject
// ─────────────────────────────────────────────
const rejectApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    const result = await query(
      `UPDATE loan_applications 
       SET status = 'rejected', admin_notes = $1, reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $3 AND status IN ('submitted', 'under_review')
       RETURNING borrower_id`,
      [admin_notes, req.user.id, id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Application not found' });

    await query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, 'Application Update', 'Unfortunately your loan application was not approved. Reason: ${admin_notes}', 'warning')`,
      [result.rows[0].borrower_id]
    );

    res.json({ message: 'Application rejected' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// MARKETPLACE — Get open listings (lenders)
// GET /api/marketplace/listings
// ─────────────────────────────────────────────
const getListings = async (req, res, next) => {
  try {
    const { min_amount, max_amount, risk_grade, term_months, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [`ll.status = 'open'`];
    const params = [];

    if (min_amount) { params.push(min_amount); conditions.push(`ll.amount_needed >= $${params.length}`); }
    if (max_amount) { params.push(max_amount); conditions.push(`ll.amount_needed <= $${params.length}`); }
    if (risk_grade) { params.push(risk_grade); conditions.push(`ll.risk_grade = $${params.length}`); }
    if (term_months) { params.push(term_months); conditions.push(`ll.term_months = $${params.length}`); }

    params.push(limit, offset);

    const result = await query(
      `SELECT ll.id, ll.amount_needed, ll.amount_funded, ll.interest_rate, ll.term_months,
              ll.risk_grade, ll.listed_at, ll.expires_at,
              (ll.amount_needed - ll.amount_funded) AS amount_remaining,
              ROUND((ll.amount_funded / ll.amount_needed * 100), 1) AS funded_pct,
              la.purpose, la.currency,
              u.country AS borrower_country,
              bp.employment_status, bp.risk_grade AS borrower_grade
       FROM loan_listings ll
       JOIN loan_applications la ON la.id = ll.application_id
       JOIN users u ON u.id = la.borrower_id
       LEFT JOIN borrower_profiles bp ON bp.user_id = la.borrower_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY ll.listed_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: result.rows, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// LENDER — Invest in listing
// POST /api/marketplace/:id/invest
// ─────────────────────────────────────────────
const invest = async (req, res, next) => {
  try {
    const { id } = req.params; // listing id
    const { amount } = req.body;

    await transaction(async (client) => {
      // Lock listing row
      const listing = await client.query(
        `SELECT * FROM loan_listings WHERE id = $1 AND status = 'open' FOR UPDATE`,
        [id]
      );

      if (!listing.rows.length) {
        throw { status: 404, message: 'Listing not found or no longer open' };
      }

      const l = listing.rows[0];
      const remaining = parseFloat(l.amount_needed) - parseFloat(l.amount_funded);

      if (parseFloat(amount) > remaining) {
        throw { status: 400, message: `Maximum investable amount is ${remaining}` };
      }

      // Check lender balance
      const lender = await client.query(
        'SELECT available_balance FROM lender_profiles WHERE user_id = $1',
        [req.user.id]
      );

      if (parseFloat(lender.rows[0].available_balance) < parseFloat(amount)) {
        throw { status: 400, message: 'Insufficient balance. Please top up your account.' };
      }

      // Deduct lender balance
      await client.query(
        'UPDATE lender_profiles SET available_balance = available_balance - $1 WHERE user_id = $2',
        [amount, req.user.id]
      );

      // Record investment
      await client.query(
        `INSERT INTO investments (lender_id, listing_id, amount, status)
         VALUES ($1, $2, $3, 'active')`,
        [req.user.id, id, amount]
      );

      // Update listing funded amount
      const newFunded = parseFloat(l.amount_funded) + parseFloat(amount);
      const newStatus = newFunded >= parseFloat(l.amount_needed) ? 'fully_funded' : 'partially_funded';

      await client.query(
        'UPDATE loan_listings SET amount_funded = $1, status = $2 WHERE id = $3',
        [newFunded, newStatus, id]
      );

      // Record transaction
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, currency, direction, reference_id, reference_type, status, description)
         VALUES ($1, 'investment', $2, 'USD', 'debit', $3, 'loan_listing', 'completed', 'Investment in loan listing')`,
        [req.user.id, amount, id]
      );

      // Collect platform commission (2% of investment)
      const commission = (parseFloat(amount) * 0.02).toFixed(2);
      await client.query(
        `INSERT INTO platform_fees (reference_id, fee_type, amount, status)
         VALUES ($1, 'commission', $2, 'paid')`,
        [id, commission]
      );
    });

    res.json({ message: 'Investment successful!' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createApplication,
  submitApplication,
  getMyApplications,
  getApplication,
  getAllApplications,
  approveApplication,
  rejectApplication,
  getListings,
  invest,
};