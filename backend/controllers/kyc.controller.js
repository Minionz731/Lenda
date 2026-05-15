/**
 * KYC Controller — SA Home Affairs Verification via Datanamix
 * All South African-specific verification logic lives here.
 */

const { query, transaction } = require('../config/db');
const {
  validateAndDecodeSAID,
  verifyIDRealtime,
  verifyIDOffline,
  verifyFaceAgainstDHA,
  checkSAFPS,
  getTransUnionReport,
  getExperianReport,
  getXDSReport,
  verifyBankAccount,
} = require('../services/datanamix.service');

// ─────────────────────────────────────────────
// POST /api/kyc/submit
// Borrower/Lender submits SA ID number + documents
// ─────────────────────────────────────────────
const submitKYC = async (req, res, next) => {
  try {
    const { sa_id_number, bank_account_number, bank_name, bank_branch_code, account_type } = req.body;

    // Step 1: Validate SA ID format locally first
    const decoded = validateAndDecodeSAID(sa_id_number);
    if (!decoded.valid) {
      return res.status(400).json({ error: decoded.error });
    }

    // Step 2: Check age — must be 18+
    if (decoded.age < 18) {
      return res.status(400).json({ error: 'You must be 18 or older to use Lenda.' });
    }

    // Step 3: Check if ID already registered to another user
    const idCheck = await query(
      'SELECT id FROM users WHERE sa_id_number = $1 AND id != $2',
      [sa_id_number, req.user.id]
    );
    if (idCheck.rows.length) {
      return res.status(409).json({ error: 'This ID number is already registered to another account.' });
    }

    // Step 4: Update user with decoded ID data
    await query(
      `UPDATE users SET sa_id_number=$1, date_of_birth=$2, gender=$3, sa_citizen=$4 WHERE id=$5`,
      [sa_id_number, decoded.dateOfBirth, decoded.gender, decoded.saCitizen, req.user.id]
    );

    // Step 5: Create KYC record
    const kycResult = await query(
      `INSERT INTO kyc_verifications (user_id, status, submitted_at)
       VALUES ($1, 'pending', NOW()) 
       ON CONFLICT (user_id) DO UPDATE SET status='pending', submitted_at=NOW()
       RETURNING id`,
      [req.user.id]
    );
    const kycId = kycResult.rows[0].id;

    // Step 6: DHA Realtime verification (async — don't block user)
    const userResult = await query('SELECT full_name FROM users WHERE id=$1', [req.user.id]);
    const nameParts = userResult.rows[0].full_name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    // Run DHA check asynchronously
    verifyIDRealtime(sa_id_number, firstName, lastName).then(async (dha) => {
      await query(
        `UPDATE kyc_verifications SET 
          dha_check_status=$1, dha_name_match=$2, dha_dob_match=$3, 
          dha_alive_status=$4, dha_id_blocked=$5, dha_checked_at=NOW(), datanamix_ref=$6
         WHERE id=$7`,
        [
          dha.success ? 'verified' : 'failed',
          dha.dha?.nameMatch || false,
          dha.dha?.dobMatch || false,
          dha.dha?.aliveStatus || 'unknown',
          dha.dha?.idBlocked || false,
          dha.datanamixRef,
          kycId,
        ]
      );

      // Auto-fail if deceased or blocked
      if (dha.success && (dha.dha?.aliveStatus === 'deceased' || dha.dha?.idBlocked)) {
        await query(
          `UPDATE kyc_verifications SET status='rejected', rejection_reason=$1 WHERE id=$2`,
          [dha.dha?.idBlocked ? 'ID number is blocked at Home Affairs' : 'ID holder is deceased', kycId]
        );
        await query(
          `UPDATE users SET status='banned' WHERE id=$1`,
          [req.user.id]
        );
      }
    }).catch(console.error);

    // Step 7: SAFPS fraud check (async)
    checkSAFPS(sa_id_number).then(async (safps) => {
      await query(
        `UPDATE kyc_verifications SET safps_status=$1, safps_checked_at=NOW() WHERE id=$2`,
        [safps.success ? safps.status : 'check_failed', kycId]
      );

      if (safps.success && safps.status === 'listed_fraudster') {
        await query(
          `UPDATE kyc_verifications SET status='rejected', rejection_reason='ID flagged by SAFPS fraud prevention' WHERE id=$2`,
          [kycId]
        );
      }
    }).catch(console.error);

    // Step 8: Bank account AVS verification (if provided)
    if (bank_account_number && bank_branch_code) {
      verifyBankAccount(sa_id_number, bank_account_number, bank_branch_code).then(async (avs) => {
        await query(
          `UPDATE kyc_verifications SET avs_status=$1, avs_id_match=$2, avs_name_match=$3, avs_checked_at=NOW() WHERE id=$4`,
          [avs.success ? avs.status : 'failed', avs.idMatch, avs.nameMatch, kycId]
        );

        // Update borrower profile with bank details
        await query(
          `UPDATE borrower_profiles SET 
            bank_name=$1, bank_account_number=$2, bank_branch_code=$3, 
            account_type=$4, bank_account_verified=$5
           WHERE user_id=$6`,
          [bank_name, bank_account_number, bank_branch_code, account_type, avs.status === 'verified', req.user.id]
        );
      }).catch(console.error);
    }

    // Notify admin of new KYC submission
    const adminResult = await query(`SELECT id FROM users WHERE role='admin' LIMIT 1`);
    if (adminResult.rows.length) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, 'New KYC Submission', 'A new KYC submission is awaiting review.', 'kyc')`,
        [adminResult.rows[0].id]
      );
    }

    res.json({
      message: 'KYC submission received. Verification in progress — you will be notified within 1 business day.',
      kycId,
      decoded: {
        dateOfBirth: decoded.dateOfBirth,
        gender: decoded.gender,
        saCitizen: decoded.saCitizen,
        age: decoded.age,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// POST /api/kyc/selfie
// Upload selfie + run face match against DHA photo
// ─────────────────────────────────────────────
const submitSelfie = async (req, res, next) => {
  try {
    const { selfieBase64 } = req.body;
    if (!selfieBase64) return res.status(400).json({ error: 'Selfie image required' });

    const user = await query('SELECT sa_id_number FROM users WHERE id=$1', [req.user.id]);
    if (!user.rows[0]?.sa_id_number) {
      return res.status(400).json({ error: 'Please submit your SA ID number first' });
    }

    const selfieUrl = `/uploads/selfies/${req.user.id}_${Date.now()}.jpg`;
    await query(`UPDATE kyc_verifications SET selfie_url=$1 WHERE user_id=$2`, [selfieUrl, req.user.id]);

    // Run face match (async)
    verifyFaceAgainstDHA(user.rows[0].sa_id_number, selfieBase64).then(async (result) => {
      await query(
        `UPDATE kyc_verifications SET face_match_score=$1, liveness_passed=$2 WHERE user_id=$3`,
        [result.matchScore, result.livenessScore > 80, req.user.id]
      );
    }).catch(console.error);

    res.json({ message: 'Selfie received. Face match in progress.' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET /api/kyc/status
// Get current KYC status for logged-in user
// ─────────────────────────────────────────────
const getKYCStatus = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT k.*, u.sa_id_number, u.date_of_birth, u.gender
       FROM kyc_verifications k
       JOIN users u ON u.id = k.user_id
       WHERE k.user_id = $1
       ORDER BY k.submitted_at DESC LIMIT 1`,
      [req.user.id]
    );

    if (!result.rows.length) {
      return res.json({ status: 'not_submitted' });
    }

    const kyc = result.rows[0];
    res.json({
      status: kyc.status,
      submittedAt: kyc.submitted_at,
      reviewedAt: kyc.reviewed_at,
      rejectionReason: kyc.rejection_reason,
      checks: {
        dha: { status: kyc.dha_check_status, nameMatch: kyc.dha_name_match, aliveStatus: kyc.dha_alive_status },
        safps: kyc.safps_status,
        faceMatch: kyc.face_match_score ? { score: kyc.face_match_score, passed: kyc.liveness_passed } : null,
        bankAccount: { status: kyc.avs_status, idMatch: kyc.avs_id_match },
      },
      decoded: {
        dateOfBirth: kyc.date_of_birth,
        gender: kyc.gender,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// POST /api/kyc/credit-check
// Pull credit bureau reports (borrower consent required — POPIA)
// ─────────────────────────────────────────────
const runCreditCheck = async (req, res, next) => {
  try {
    const { consent } = req.body;
    if (!consent) {
      return res.status(400).json({ error: 'Explicit consent is required under POPIA before running a credit check.' });
    }

    const user = await query('SELECT sa_id_number, full_name FROM users WHERE id=$1', [req.user.id]);
    const { sa_id_number, full_name } = user.rows[0];

    if (!sa_id_number) return res.status(400).json({ error: 'KYC must be submitted before credit check' });

    const nameParts = full_name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    // Pull from all 3 bureaus concurrently
    const [tuResult, expResult, xdsResult] = await Promise.allSettled([
      getTransUnionReport(sa_id_number, firstName, lastName),
      getExperianReport(sa_id_number, firstName, lastName),
      getXDSReport(sa_id_number, firstName, lastName),
    ]);

    const scores = [];

    for (const { status, value } of [tuResult, expResult, xdsResult]) {
      if (status === 'fulfilled' && value.success) {
        // Store report
        await query(
          `INSERT INTO credit_reports (user_id, bureau, score, risk_category, total_accounts, adverse_listings, judgements, defaults, monthly_payments, raw_response)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [req.user.id, value.bureau, value.score, value.riskCategory, value.totalAccounts, value.adverseListings, value.judgements, value.defaults, value.monthlyPayments, JSON.stringify(value.raw)]
        );
        scores.push(value.score);
      }
    }

    // Calculate composite score (average of available)
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const riskGrade = avgScore >= 700 ? 'A' : avgScore >= 600 ? 'B' : avgScore >= 500 ? 'C' : avgScore >= 400 ? 'D' : 'E';

    // Update borrower profile
    await query(
      `UPDATE borrower_profiles SET credit_score=$1, risk_grade=$2 WHERE user_id=$3`,
      [avgScore, riskGrade, req.user.id]
    );

    res.json({
      message: 'Credit check complete',
      compositeScore: avgScore,
      riskGrade,
      bureausChecked: scores.length,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// ADMIN — GET all pending KYC verifications
// GET /api/admin/kyc
// ─────────────────────────────────────────────
const getAdminKYCQueue = async (req, res, next) => {
  try {
    const { status = 'pending' } = req.query;
    const result = await query(
      `SELECT k.*, u.full_name, u.email, u.sa_id_number, u.role, u.province, u.date_of_birth
       FROM kyc_verifications k
       JOIN users u ON u.id = k.user_id
       WHERE k.status = $1
       ORDER BY k.submitted_at ASC`,
      [status]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// ADMIN — Approve KYC
const approveKYC = async (req, res, next) => {
  try {
    const { id } = req.params;

    await transaction(async (client) => {
      const r = await client.query(
        `UPDATE kyc_verifications SET status='approved', reviewed_by=$1, reviewed_at=NOW()
         WHERE id=$2 RETURNING user_id`,
        [req.user.id, id]
      );
      if (!r.rows.length) throw { status: 404, message: 'KYC not found' };

      const userId = r.rows[0].user_id;
      await client.query(`UPDATE users SET status='active' WHERE id=$1`, [userId]);
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, '✅ Identity Verified!', 'Your KYC has been approved. You can now access all Lenda features.', 'success')`,
        [userId]
      );
      await client.query(
        `INSERT INTO audit_logs (actor_id, action, target_type, target_id) VALUES ($1,'approve_kyc','kyc',$2)`,
        [req.user.id, id]
      );
    });

    res.json({ message: 'KYC approved. User is now active.' });
  } catch (err) { next(err); }
};

// ADMIN — Reject KYC
const rejectKYC = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    if (!rejection_reason) return res.status(400).json({ error: 'Rejection reason required' });

    const r = await query(
      `UPDATE kyc_verifications SET status='rejected', rejection_reason=$1, reviewed_by=$2, reviewed_at=NOW()
       WHERE id=$3 RETURNING user_id`,
      [rejection_reason, req.user.id, id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'KYC not found' });

    await query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,'KYC Update',$2,'warning')`,
      [r.rows[0].user_id, `Your KYC was not approved: ${rejection_reason}. Please re-submit with correct documents.`]
    );

    res.json({ message: 'KYC rejected' });
  } catch (err) { next(err); }
};

module.exports = { submitKYC, submitSelfie, getKYCStatus, runCreditCheck, getAdminKYCQueue, approveKYC, rejectKYC };