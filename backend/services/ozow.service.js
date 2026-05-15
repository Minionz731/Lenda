/**
 * ─────────────────────────────────────────────────────────────────────────────
 * OZOW PAYMENT SERVICE — South Africa
 * 
 * Ozow connects to all major SA banks (47M+ account holders)
 * Used in Lenda for: Application fees, lender wallet top-ups
 * 
 * Supported banks: ABSA, FNB, Standard Bank, Nedbank, Capitec, African Bank, 
 *                  Discovery Bank, TymeBank, Bidvest, Investec
 *
 * Docs: https://ozow.com/developers/
 * Auth: API Key + Site Code (from Ozow merchant dashboard)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const crypto = require('crypto');

const OZOW_BASE = process.env.NODE_ENV === 'production'
  ? 'https://api.ozow.com'
  : 'https://stagingapi.ozow.com';

const SITE_CODE    = process.env.OZOW_SITE_CODE;
const PRIVATE_KEY  = process.env.OZOW_PRIVATE_KEY;
const API_KEY      = process.env.OZOW_API_KEY;

// ─────────────────────────────────────────────
// Generate Ozow SHA512 Hash
// Required to authenticate each payment request
// ─────────────────────────────────────────────
const generateHash = (params) => {
  // Concatenate all values (in defined order) + private key
  const hashString = Object.values(params).join('') + PRIVATE_KEY;
  return crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();
};

// ─────────────────────────────────────────────
// 1. CREATE PAYMENT (Application fee / top-up)
//    Returns a payment URL — redirect user here
// ─────────────────────────────────────────────
const createPayment = async ({
  amount,
  transactionRef,
  bankRef,
  cancelUrl,
  errorUrl,
  successUrl,
  notifyUrl,
  isTest = process.env.NODE_ENV !== 'production',
}) => {
  const params = {
    SiteCode:           SITE_CODE,
    CountryCode:        'ZA',
    CurrencyCode:       'ZAR',
    Amount:             parseFloat(amount).toFixed(2),
    TransactionReference: transactionRef,   // Your internal reference
    BankReference:      bankRef,            // Shown on customer bank statement (max 20 chars)
    CancelUrl:          cancelUrl,
    ErrorUrl:           errorUrl,
    SuccessUrl:         successUrl,
    NotifyUrl:          notifyUrl,          // Server-side webhook for payment notification
    IsTest:             isTest ? 'true' : 'false',
  };

  params.HashCheck = generateHash(params);

  const response = await fetch(`${OZOW_BASE}/postpaymentrequest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ApiKey': API_KEY,
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();

  if (!response.ok || data.errorMessage) {
    return { success: false, error: data.errorMessage || 'Ozow payment creation failed' };
  }

  return {
    success: true,
    paymentUrl: data.url,                  // Redirect user to this URL
    paymentRequestId: data.paymentRequestId,
    transactionRef,
  };
};

// ─────────────────────────────────────────────
// 2. GET PAYMENT STATUS (server-side check)
// ─────────────────────────────────────────────
const getPaymentStatus = async (transactionRef) => {
  const response = await fetch(
    `${OZOW_BASE}/gettransaction?siteCode=${SITE_CODE}&transactionReference=${transactionRef}&isTest=${process.env.NODE_ENV !== 'production'}`,
    {
      headers: { 'ApiKey': API_KEY },
    }
  );

  const data = await response.json();
  return {
    success: response.ok,
    status: data[0]?.status,               // 'Complete' | 'Cancelled' | 'Error' | 'PendingInvestigation'
    amount: data[0]?.amount,
    bankRef: data[0]?.bankRef,
    currencyCode: data[0]?.currencyCode,
    transactionDate: data[0]?.createdDate,
  };
};

// ─────────────────────────────────────────────
// 3. VERIFY INCOMING WEBHOOK NOTIFICATION
//    Ozow posts to your NotifyUrl on payment completion
// ─────────────────────────────────────────────
const verifyWebhookNotification = (body) => {
  const {
    SiteCode, TransactionId, TransactionReference,
    Amount, Status, Optional1, Optional2, Optional3,
    Optional4, Optional5, CurrencyCode, IsTest, HashCheck,
  } = body;

  const expected = generateHash({
    SiteCode, TransactionId, TransactionReference,
    Amount, Status, Optional1, Optional2, Optional3,
    Optional4, Optional5, CurrencyCode, IsTest,
  });

  return HashCheck?.toLowerCase() === expected;
};

// ─────────────────────────────────────────────
// OZOW STATUS MAPPING
// ─────────────────────────────────────────────
const OZOW_STATUS = {
  Complete:             'completed',
  Cancelled:            'cancelled',
  Error:                'failed',
  PendingInvestigation: 'pending',
  AbandonedByUser:      'cancelled',
};

module.exports = {
  createPayment,
  getPaymentStatus,
  verifyWebhookNotification,
  OZOW_STATUS,
};