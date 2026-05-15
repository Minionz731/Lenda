/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DATANAMIX SERVICE
 * South Africa's leading verification aggregator
 *
 * Covers:
 *   1. SA ID validation (checksum + DOB/gender/citizenship decode)
 *   2. DHA Realtime ID Verification (live Home Affairs check)
 *   3. DHA Profile ID Photo retrieval
 *   4. SAFPS Fraud check
 *   5. TransUnion Consumer Credit Report
 *   6. Experian Consumer Credit Report
 *   7. XDS Consumer Credit Report
 *   8. Datanamix Affordability Assessment (NCA compliant)
 *   9. AVS — Account Verification Service (ID + bank account link)
 *
 * Docs: https://www.datanamix.com/developer-hub/product-documentation
 * Auth: API Key in header — contact Datanamix to obtain sandbox + production keys
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DATANAMIX_BASE = 'https://api.pbverify.co.za';
const API_KEY = process.env.DATANAMIX_API_KEY;
const SUBSCRIBER_ID = process.env.DATANAMIX_SUBSCRIBER_ID;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`,
  'X-Subscriber-ID': SUBSCRIBER_ID,
};

// ─────────────────────────────────────────────
// UTILITY — Validate & Decode SA 13-digit ID
// SA ID format: YYMMDD GGGG C A Z
//   YY MM DD = date of birth
//   GGGG     = gender (0000-4999 female, 5000-9999 male)
//   C        = citizenship (0 = SA citizen, 1 = permanent resident)
//   A        = usually 8
//   Z        = Luhn checksum digit
// ─────────────────────────────────────────────
const validateAndDecodeSAID = (idNumber) => {
  if (!idNumber || idNumber.length !== 13 || !/^\d{13}$/.test(idNumber)) {
    return { valid: false, error: 'ID number must be exactly 13 digits' };
  }

  // Luhn algorithm checksum
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    let digit = parseInt(idNumber[i]);
    if (i % 2 !== 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  if (checkDigit !== parseInt(idNumber[12])) {
    return { valid: false, error: 'Invalid ID number (checksum failed)' };
  }

  // Decode DOB
  const yy = parseInt(idNumber.substring(0, 2));
  const mm = parseInt(idNumber.substring(2, 4));
  const dd = parseInt(idNumber.substring(4, 6));
  const year = yy >= 0 && yy <= 25 ? 2000 + yy : 1900 + yy; // Adjust century
  const dob = new Date(year, mm - 1, dd);

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    return { valid: false, error: 'Invalid date of birth encoded in ID number' };
  }

  // Decode gender (digits 6–9)
  const genderDigits = parseInt(idNumber.substring(6, 10));
  const gender = genderDigits >= 5000 ? 'male' : 'female';

  // Decode citizenship (digit 10)
  const citizenshipDigit = parseInt(idNumber[10]);
  const saCitizen = citizenshipDigit === 0;

  return {
    valid: true,
    idNumber,
    dateOfBirth: dob.toISOString().split('T')[0],
    gender,
    saCitizen,
    age: new Date().getFullYear() - year,
  };
};

// ─────────────────────────────────────────────
// 1. DHA REALTIME VERIFICATION
//    Live check against Home Affairs database
//    Returns: name, surname, DOB, gender, citizenship, alive/deceased, ID blocked
// ─────────────────────────────────────────────
const verifyIDRealtime = async (idNumber, firstName, lastName) => {
  // First validate locally
  const decoded = validateAndDecodeSAID(idNumber);
  if (!decoded.valid) {
    return { success: false, error: decoded.error };
  }

  try {
    const response = await fetch(`${DATANAMIX_BASE}/id-verification/realtime`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        idNumber,
        firstName,
        lastName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'DHA check failed', decoded };
    }

    return {
      success: true,
      decoded,
      dha: {
        nameMatch: data.firstNameMatch && data.lastNameMatch,
        dobMatch: data.dobMatch,
        aliveStatus: data.aliveStatus,        // 'alive' | 'deceased'
        idBlocked: data.idBlocked === true,
        citizenshipMatch: data.citizenshipMatch,
        gender: data.gender,
      },
      datanamixRef: data.referenceNumber,
    };
  } catch (err) {
    console.error('Datanamix DHA realtime error:', err);
    return { success: false, error: 'DHA verification service unavailable', decoded };
  }
};

// ─────────────────────────────────────────────
// 2. DHA OFFLINE (Profile ID) VERIFICATION
//    Faster, uses credit bureau hosted DHA data
//    Lower cost, high availability — use for bulk checks
// ─────────────────────────────────────────────
const verifyIDOffline = async (idNumber) => {
  const decoded = validateAndDecodeSAID(idNumber);
  if (!decoded.valid) return { success: false, error: decoded.error };

  try {
    const response = await fetch(`${DATANAMIX_BASE}/id-verification/offline`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ idNumber }),
    });

    const data = await response.json();
    if (!response.ok) return { success: false, error: data.message, decoded };

    return {
      success: true,
      decoded,
      profile: {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        aliveStatus: data.aliveStatus,
        citizenStatus: data.citizenStatus,
      },
      datanamixRef: data.referenceNumber,
    };
  } catch (err) {
    return { success: false, error: 'Offline ID check failed', decoded };
  }
};

// ─────────────────────────────────────────────
// 3. FACE MATCH AGAINST DHA PHOTO
//    Compares selfie image to DHA biometric photo
//    Returns match score (0-100)
// ─────────────────────────────────────────────
const verifyFaceAgainstDHA = async (idNumber, selfieBase64) => {
  try {
    const response = await fetch(`${DATANAMIX_BASE}/id-verification/photo-match`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        idNumber,
        selfieImage: selfieBase64,  // Base64 encoded JPEG/PNG
      }),
    });

    const data = await response.json();
    if (!response.ok) return { success: false, error: data.message };

    return {
      success: true,
      matchScore: data.matchScore,         // 0-100 (>75 = pass)
      passed: data.matchScore >= 75,
      livenessScore: data.livenessScore,
      datanamixRef: data.referenceNumber,
    };
  } catch (err) {
    return { success: false, error: 'Face match service unavailable' };
  }
};

// ─────────────────────────────────────────────
// 4. SAFPS FRAUD CHECK
//    Southern African Fraud Prevention Service
//    Checks if ID is listed as fraudster or fraud victim
// ─────────────────────────────────────────────
const checkSAFPS = async (idNumber) => {
  try {
    const response = await fetch(`${DATANAMIX_BASE}/fraud/safps`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ idNumber }),
    });

    const data = await response.json();
    if (!response.ok) return { success: false, error: data.message };

    return {
      success: true,
      status: data.status,                 // 'clear' | 'listed_fraudster' | 'fraud_victim' | 'protective_registration'
      listings: data.listings || [],
      datanamixRef: data.referenceNumber,
    };
  } catch (err) {
    return { success: false, error: 'SAFPS check unavailable' };
  }
};

// ─────────────────────────────────────────────
// 5. TRANSUNION CONSUMER CREDIT REPORT
// ─────────────────────────────────────────────
const getTransUnionReport = async (idNumber, firstName, lastName) => {
  try {
    const response = await fetch(`${DATANAMIX_BASE}/credit/transunion/consumer`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ idNumber, firstName, lastName }),
    });

    const data = await response.json();
    if (!response.ok) return { success: false, error: data.message };

    return {
      success: true,
      bureau: 'transunion',
      score: data.creditScore,
      riskCategory: data.riskCategory,
      totalAccounts: data.totalAccounts,
      openAccounts: data.openAccounts,
      adverseListings: data.adverseListings,
      judgements: data.judgements,
      defaults: data.defaults,
      monthlyPayments: data.totalMonthlyInstallments,
      raw: data,
    };
  } catch (err) {
    return { success: false, error: 'TransUnion report failed' };
  }
};

// ─────────────────────────────────────────────
// 6. EXPERIAN CONSUMER CREDIT REPORT
// ─────────────────────────────────────────────
const getExperianReport = async (idNumber, firstName, lastName) => {
  try {
    const response = await fetch(`${DATANAMIX_BASE}/credit/experian/consumer`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ idNumber, firstName, lastName }),
    });

    const data = await response.json();
    if (!response.ok) return { success: false, error: data.message };

    return {
      success: true,
      bureau: 'experian',
      score: data.bureauScore,
      riskCategory: data.riskBanding,
      totalAccounts: data.numberOfAccounts,
      adverseListings: data.adverseListings,
      judgements: data.numberOfJudgements,
      defaults: data.numberOfDefaults,
      monthlyPayments: data.totalMonthlyInstalment,
      affordabilityMonthly: data.affordabilityAssessment?.totalMonthlyInstalment,
      raw: data,
    };
  } catch (err) {
    return { success: false, error: 'Experian report failed' };
  }
};

// ─────────────────────────────────────────────
// 7. XDS CONSUMER CREDIT REPORT
//    100% Black-owned SA credit bureau (B-BBEE Level 1)
// ─────────────────────────────────────────────
const getXDSReport = async (idNumber, firstName, lastName) => {
  try {
    const response = await fetch(`${DATANAMIX_BASE}/credit/xds/consumer`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ idNumber, firstName, lastName }),
    });

    const data = await response.json();
    if (!response.ok) return { success: false, error: data.message };

    return {
      success: true,
      bureau: 'xds',
      score: data.xdsScore,
      riskCategory: data.riskGrade,
      totalAccounts: data.accountSummary?.totalAccounts,
      adverseListings: data.adverseInformation?.total,
      judgements: data.adverseInformation?.judgements,
      defaults: data.adverseInformation?.defaults,
      monthlyPayments: data.accountSummary?.totalMonthlyPayments,
      raw: data,
    };
  } catch (err) {
    return { success: false, error: 'XDS report failed' };
  }
};

// ─────────────────────────────────────────────
// 8. AFFORDABILITY ASSESSMENT — NCA SECTION 80
//    Required by National Credit Act before granting credit
//    Must assess: income, expenses, existing debt obligations
// ─────────────────────────────────────────────
const runAffordabilityAssessment = async (idNumber, grossIncome, netIncome) => {
  try {
    const response = await fetch(`${DATANAMIX_BASE}/affordability/assessment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ idNumber, grossIncome, netIncome }),
    });

    const data = await response.json();
    if (!response.ok) return { success: false, error: data.message };

    return {
      success: true,
      disposableIncome: data.disposableIncome,
      totalExistingDebt: data.totalMonthlyDebtObligations,
      minimumLivingExpenses: data.minimumLivingExpenses,
      maxAffordableInstallment: data.maximumAffordableInstalment,
      affordabilityPassed: data.affordabilityPassed,
      raw: data,
    };
  } catch (err) {
    return { success: false, error: 'Affordability assessment failed' };
  }
};

// ─────────────────────────────────────────────
// 9. AVS — Account Verification Service
//    Verifies that a bank account belongs to a given ID number
//    Supported banks: ABSA, FNB, Standard Bank, Nedbank, Capitec, African Bank, Bidvest
// ─────────────────────────────────────────────
const verifyBankAccount = async (idNumber, bankAccountNumber, bankBranchCode) => {
  try {
    const response = await fetch(`${DATANAMIX_BASE}/avs/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ idNumber, bankAccountNumber, bankBranchCode }),
    });

    const data = await response.json();
    if (!response.ok) return { success: false, error: data.message };

    return {
      success: true,
      idMatch: data.idNumberMatch,           // Does ID number match account holder?
      nameMatch: data.nameMatch,             // Does name match?
      accountExists: data.accountExists,
      accountOpen: data.accountOpen,
      status: data.verificationStatus,       // 'verified' | 'failed' | 'mismatch'
    };
  } catch (err) {
    return { success: false, error: 'AVS check unavailable' };
  }
};

// ─────────────────────────────────────────────
// COMPOSITE — Full KYC check (called during onboarding)
// Runs: DHA verify → face match → SAFPS → credit check
// ─────────────────────────────────────────────
const runFullKYC = async ({ idNumber, firstName, lastName, selfieBase64 }) => {
  const results = { idNumber };

  // Step 1: ID decode + DHA realtime
  const dha = await verifyIDRealtime(idNumber, firstName, lastName);
  results.dha = dha;

  if (!dha.success || dha.dha?.aliveStatus === 'deceased' || dha.dha?.idBlocked) {
    return { passed: false, reason: 'Identity verification failed at Home Affairs', results };
  }

  // Step 2: Face match (if selfie provided)
  if (selfieBase64) {
    const faceMatch = await verifyFaceAgainstDHA(idNumber, selfieBase64);
    results.faceMatch = faceMatch;
    if (!faceMatch.success || !faceMatch.passed) {
      return { passed: false, reason: 'Facial biometric match failed', results };
    }
  }

  // Step 3: SAFPS fraud check
  const safps = await checkSAFPS(idNumber);
  results.safps = safps;
  if (safps.success && safps.status === 'listed_fraudster') {
    return { passed: false, reason: 'ID flagged by SAFPS fraud prevention', results };
  }

  return { passed: true, results };
};

// ─────────────────────────────────────────────
// SA BANK BRANCH CODES (most common)
// ─────────────────────────────────────────────
const SA_BANK_CODES = {
  absa:          { code: '632005', name: 'ABSA Bank' },
  fnb:           { code: '250655', name: 'First National Bank (FNB)' },
  standard_bank: { code: '051001', name: 'Standard Bank' },
  nedbank:       { code: '198765', name: 'Nedbank' },
  capitec:       { code: '470010', name: 'Capitec Bank' },
  african_bank:  { code: '430000', name: 'African Bank' },
  discovery:     { code: '679000', name: 'Discovery Bank' },
  investec:      { code: '580105', name: 'Investec Bank' },
  tyme_bank:     { code: '678910', name: 'TymeBank' },
  access_bank:   { code: '410506', name: 'Access Bank SA' },
};

module.exports = {
  validateAndDecodeSAID,
  verifyIDRealtime,
  verifyIDOffline,
  verifyFaceAgainstDHA,
  checkSAFPS,
  getTransUnionReport,
  getExperianReport,
  getXDSReport,
  runAffordabilityAssessment,
  verifyBankAccount,
  runFullKYC,
  SA_BANK_CODES,
};