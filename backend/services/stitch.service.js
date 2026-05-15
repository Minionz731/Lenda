/**
 * ─────────────────────────────────────────────────────────────────────────────
 * STITCH PAYMENT SERVICE — South Africa
 * 
 * Stitch is the primary SA payments infrastructure for Lenda.
 * It supports: Capitec Pay, Absa Pay, Nedbank Direct, FNB, Standard Bank
 * 
 * Use cases for Lenda:
 *  1. LinkPay  — Lender wallet top-up (instant EFT / pay by bank)
 *  2. Disburse — Send loan funds to borrower's bank account
 *  3. Collect  — Collect repayments via debit order / instant EFT
 *  4. PayOut   — Return lender investment returns to their bank
 *  5. AVS      — Bank account verification (via Datanamix AVS)
 *
 * Docs: https://stitch.money/docs
 * Auth: OAuth2 client_credentials
 * ─────────────────────────────────────────────────────────────────────────────
 */

const STITCH_BASE = 'https://api.stitch.money';
const CLIENT_ID = process.env.STITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.STITCH_CLIENT_SECRET;

let _tokenCache = null;

// ─────────────────────────────────────────────
// OAuth2 Token (client_credentials)
// ─────────────────────────────────────────────
const getAccessToken = async () => {
  if (_tokenCache && _tokenCache.expiresAt > Date.now()) {
    return _tokenCache.token;
  }

  const response = await fetch(`${STITCH_BASE}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      audience: 'https://secure.stitch.money',
      scope: 'client_paymentrequest client_disbursement client_refund',
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`Stitch auth failed: ${data.error}`);

  _tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return _tokenCache.token;
};

// Stitch GraphQL helper
const stitchQuery = async (query, variables = {}) => {
  const token = await getAccessToken();
  const response = await fetch(`${STITCH_BASE}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await response.json();
  if (data.errors) throw new Error(data.errors[0].message);
  return data.data;
};

// ─────────────────────────────────────────────
// 1. CREATE PAYMENT REQUEST (Lender Wallet Top-up)
//    Generates a payment link (instant EFT / Capitec Pay / Absa Pay)
//    Lender clicks link → pays from their bank → Lenda credits their wallet
// ─────────────────────────────────────────────
const createPaymentRequest = async ({ amount, currency = 'ZAR', reference, externalRef, beneficiaryName }) => {
  const query = `
    mutation CreatePaymentRequest($input: ClientPaymentRequestCreateInput!) {
      clientPaymentRequestCreate(input: $input) {
        paymentRequest {
          id
          url
          status
          amount { quantity currency }
        }
      }
    }
  `;

  const data = await stitchQuery(query, {
    input: {
      amount: { quantity: amount, currency },
      payerReference: reference,          // Shown on payer's bank statement
      beneficiaryReference: externalRef,  // Internal reference
      externalReference: externalRef,
      beneficiaryName: beneficiaryName || 'Lenda (Pty) Ltd',
    },
  });

  const pr = data.clientPaymentRequestCreate.paymentRequest;
  return {
    success: true,
    paymentRequestId: pr.id,
    paymentUrl: pr.url,         // Redirect user here OR embed as QR code
    status: pr.status,
  };
};

// ─────────────────────────────────────────────
// 2. DISBURSE FUNDS (Loan payout to borrower)
//    Sends ZAR from Lenda's bank account directly to borrower's bank
//    Supports: ABSA, FNB, Standard Bank, Nedbank, Capitec, African Bank
// ─────────────────────────────────────────────
const disburseFunds = async ({ amount, reference, recipientName, bankAccountNumber, bankId, accountType = 'current' }) => {
  const query = `
    mutation Disburse($input: ClientDisbursementCreateInput!) {
      clientDisbursementCreate(input: $input) {
        disbursement {
          id
          status
          amount { quantity currency }
          created
        }
      }
    }
  `;

  const data = await stitchQuery(query, {
    input: {
      amount: { quantity: amount, currency: 'ZAR' },
      reference,
      beneficiary: {
        bankAccount: {
          name: recipientName,
          accountNumber: bankAccountNumber,
          bankId,                        // e.g. 'absa', 'fnb', 'standard_bank', 'nedbank', 'capitec'
          accountType,                   // 'current' | 'savings'
          reference,
        },
      },
    },
  });

  const d = data.clientDisbursementCreate.disbursement;
  return {
    success: true,
    disbursementId: d.id,
    status: d.status,
    amount: d.amount.quantity,
  };
};

// ─────────────────────────────────────────────
// 3. CREATE DEBIT ORDER — Collect Monthly Repayments
//    Requires signed DebiCheck mandate from borrower
//    DebiCheck is the SA Reserve Bank standard for authenticated debit orders
// ─────────────────────────────────────────────
const createDebiCheckMandate = async ({ borrowerName, idNumber, bankAccountNumber, bankId, loanId, monthlyAmount, firstCollectionDate }) => {
  /**
   * NOTE: DebiCheck mandates go through NAEDO/AEDO system via your bank
   * Stitch supports this via their collections product
   * This must be set up with a South African bank (ABSA, FNB, etc) as your collecting bank
   * The borrower authenticates on their banking app — no paper mandate needed
   */
  const query = `
    mutation CreateMandate($input: DebiCheckMandateCreateInput!) {
      debiCheckMandateCreate(input: $input) {
        mandate {
          id
          status
          mandateReference
        }
      }
    }
  `;

  const data = await stitchQuery(query, {
    input: {
      debtorName: borrowerName,
      debtorIdNumber: idNumber,
      debtorBankAccount: { accountNumber: bankAccountNumber, bankId },
      contractReference: loanId,
      installmentAmount: { quantity: monthlyAmount, currency: 'ZAR' },
      firstCollectionDate,
      collectionFrequency: 'MONTHLY',
      adjustmentAllowed: false,
    },
  });

  return {
    success: true,
    mandateId: data.debiCheckMandateCreate.mandate.id,
    status: data.debiCheckMandateCreate.mandate.status,
    mandateReference: data.debiCheckMandateCreate.mandate.mandateReference,
  };
};

// ─────────────────────────────────────────────
// 4. GET PAYMENT STATUS (webhook fallback)
// ─────────────────────────────────────────────
const getPaymentStatus = async (paymentRequestId) => {
  const query = `
    query GetPayment($id: ID!) {
      node(id: $id) {
        ... on PaymentRequest {
          id
          status
          amount { quantity currency }
          payer { ... on BankAccountPaymentSource { bankAccount { bankId accountNumber } } }
          paymentConfirmation { date amount { quantity currency } }
        }
      }
    }
  `;

  const data = await stitchQuery(query, { id: paymentRequestId });
  return data.node;
};

// ─────────────────────────────────────────────
// 5. VERIFY WEBHOOK SIGNATURE
//    Stitch signs all webhook payloads with HMAC-SHA256
// ─────────────────────────────────────────────
const verifyWebhook = (payload, signature) => {
  const crypto = require('crypto');
  const secret = process.env.STITCH_WEBHOOK_SECRET;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return signature === expected;
};

// ─────────────────────────────────────────────
// SUPPORTED SA BANKS on Stitch
// ─────────────────────────────────────────────
const STITCH_BANKS = {
  absa:          'absa',
  fnb:           'fnb',
  standard_bank: 'standardBank',
  nedbank:       'nedbank',
  capitec:       'capitec',
  african_bank:  'africanBank',
  bidvest:       'bidvestBank',
  tyme_bank:     'tymeBank',
  discovery:     'discoveryBank',
  investec:      'investec',
};

module.exports = {
  createPaymentRequest,
  disburseFunds,
  createDebiCheckMandate,
  getPaymentStatus,
  verifyWebhook,
  STITCH_BANKS,
};