const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { submitKYC, submitSelfie, getKYCStatus, runCreditCheck, getAdminKYCQueue, approveKYC, rejectKYC } = require('../controllers/kyc.controller');

router.post('/submit', authenticate, submitKYC);
router.post('/selfie', authenticate, submitSelfie);
router.get('/status', authenticate, getKYCStatus);
router.post('/credit-check', authenticate, runCreditCheck);

module.exports = router;