const express = require('express');
const router = express.Router();
const { authenticate, requireRole, requireKYC } = require('../middleware/auth');
const { createApplication, submitApplication, getMyApplications, getApplication } = require('../controllers/loan.controller');
const multer = require('multer');
const { query } = require('../config/db');

const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate, requireRole('borrower'));

// Profile
router.get('/profile', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.full_name, u.email, u.country, u.phone, u.status, u.sa_id_number, u.province,
              bp.*,
              k.status AS kyc_status
       FROM users u
       LEFT JOIN borrower_profiles bp ON bp.user_id = u.id
       LEFT JOIN kyc_verifications k ON k.user_id = u.id AND k.status = 'approved'
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

router.put('/profile', async (req, res, next) => {
  try {
    const { employment_status, employer_name, monthly_income, bank_name, date_of_birth, gross_monthly_income, net_monthly_income } = req.body;
    await query(
      `UPDATE borrower_profiles SET employment_status=$1, employer_name=$2,
       gross_monthly_income=$3, net_monthly_income=$4, bank_name=$5 WHERE user_id=$6`,
      [employment_status, employer_name, gross_monthly_income, net_monthly_income, bank_name, req.user.id]
    );
    res.json({ message: 'Profile updated' });
  } catch (err) { next(err); }
});

// Loans
router.post('/loans', requireKYC, createApplication);
router.put('/loans/:id/submit', requireKYC, submitApplication);
router.get('/loans', getMyApplications);
router.get('/loans/:id', getApplication);

// Document upload
router.post('/loans/:id/documents', requireKYC, upload.single('file'), async (req, res, next) => {
  try {
    const { doc_type } = req.body;
    const { id } = req.params;
    const check = await query(
      'SELECT id FROM loan_applications WHERE id=$1 AND borrower_id=$2',
      [id, req.user.id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Loan not found' });
    const fileUrl = `/uploads/${req.file.filename}`;
    await query(
      `INSERT INTO loan_documents (application_id, doc_type, file_url, file_name) VALUES ($1,$2,$3,$4)`,
      [id, doc_type, fileUrl, req.file.originalname]
    );
    res.status(201).json({ message: 'Document uploaded', file_url: fileUrl });
  } catch (err) { next(err); }
});

// Repayment schedule
router.get('/loans/:id/schedule', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT rs.* FROM repayment_schedule rs
       JOIN loan_applications la ON la.id = rs.application_id
       WHERE rs.application_id=$1 AND la.borrower_id=$2
       ORDER BY rs.installment_no`,
      [req.params.id, req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;