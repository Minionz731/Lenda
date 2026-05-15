/**
 * ─────────────────────────────────────────────────────────────────────────────
 * NCA COMPLIANCE SERVICE — National Credit Act 34 of 2005
 * 
 * Lenda must comply with the NCA before operating as a credit provider in SA.
 * This service handles all NCA-specific calculations and validations.
 *
 * Key NCA Requirements for Lenda:
 *  1. NCR Registration (credit provider) — mandatory
 *  2. Interest rate caps per credit category
 *  3. Affordability assessment before granting credit
 *  4. Pre-agreement statement (binding 5 business days)
 *  5. Cooling-off period (5 business days for certain agreements)
 *  6. Monthly reporting to credit bureaus
 *  7. Plain language contracts
 *  8. Anti-reckless lending checks
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────
// NCA CREDIT CATEGORIES & INTEREST RATE CAPS
// As per National Credit Regulations (updated periodically by DTI)
// Formula: Max rate = Repo Rate × multiplier + X%
// Current SARB repo rate: ~8.25% (update this when repo changes)
// ─────────────────────────────────────────────
const REPO_RATE = parseFloat(process.env.SARB_REPO_RATE || '8.25');

const NCA_INTEREST_CAPS = {
  // Small credit agreements: principal ≤ R15,000, term ≤ 12 months
  small: {
    maxPrincipal: 15000,
    maxTermMonths: 12,
    maxAnnualRate: () => Math.min(5 * REPO_RATE + 21, 60), // Cap at 60% p.a.
    description: 'Small Credit Agreement',
  },
  // Short-term credit: ≤ R8,000, term ≤ 6 months (includes payday)
  short_term: {
    maxPrincipal: 8000,
    maxTermMonths: 6,
    maxAnnualRate: () => 5,  // Max 5% per month (flat)
    maxInitiationFee: (principal) => Math.min(150 + 0.10 * principal, 1050), // NCA formula
    maxServiceFee: 60,       // Per month
    description: 'Short-term Credit Agreement',
  },
  // Unsecured personal loans: principal > R15,000 or term > 12 months
  unsecured: {
    maxAnnualRate: () => 2.2 * REPO_RATE + 20, // e.g. 8.25 × 2.2 + 20 = 38.15%
    maxInitiationFee: (principal) => Math.min(165 + 0.10 * principal, 1207.50),
    maxServiceFee: 69,       // Per month (NCA regulated, adjusted periodically)
    description: 'Unsecured Credit Agreement',
  },
  // Developmental credit (housing, education etc.)
  developmental: {
    maxAnnualRate: () => 2.2 * REPO_RATE + 20,
    description: 'Developmental Credit Agreement',
  },
};

// ─────────────────────────────────────────────
// Determine credit category from loan amount + term
// ─────────────────────────────────────────────
const getCreditCategory = (principalAmount, termMonths) => {
  if (principalAmount <= 8000 && termMonths <= 6) return 'short_term';
  if (principalAmount <= 15000 && termMonths <= 12) return 'small';
  return 'unsecured';
};

// ─────────────────────────────────────────────
// Validate that proposed interest rate complies with NCA caps
// ─────────────────────────────────────────────
const validateInterestRate = (principal, termMonths, proposedAnnualRate) => {
  const category = getCreditCategory(principal, termMonths);
  const cap = NCA_INTEREST_CAPS[category];
  const maxRate = cap.maxAnnualRate();

  if (proposedAnnualRate > maxRate) {
    return {
      compliant: false,
      category: cap.description,
      proposedRate: proposedAnnualRate,
      maxAllowedRate: maxRate,
      error: `Interest rate of ${proposedAnnualRate}% exceeds NCA cap of ${maxRate.toFixed(2)}% for ${cap.description}`,
    };
  }

  return {
    compliant: true,
    category: cap.description,
    proposedRate: proposedAnnualRate,
    maxAllowedRate: maxRate,
  };
};

// ─────────────────────────────────────────────
// Calculate NCA regulated fees
// ─────────────────────────────────────────────
const calculateNCAFees = (principal, termMonths) => {
  const category = getCreditCategory(principal, termMonths);
  const cap = NCA_INTEREST_CAPS[category];

  const initiationFee = cap.maxInitiationFee ? cap.maxInitiationFee(principal) : 0;
  const monthlyServiceFee = cap.maxServiceFee || 0;
  const totalServiceFees = monthlyServiceFee * termMonths;

  return {
    category,
    initiationFee: parseFloat(initiationFee.toFixed(2)),
    monthlyServiceFee: parseFloat(monthlyServiceFee.toFixed(2)),
    totalServiceFees: parseFloat(totalServiceFees.toFixed(2)),
  };
};

// ─────────────────────────────────────────────
// Calculate full loan cost (NCA pre-agreement statement)
// ─────────────────────────────────────────────
const calculateLoanCost = (principal, annualRate, termMonths) => {
  const fees = calculateNCAFees(principal, termMonths);
  const monthlyRate = annualRate / 100 / 12;
  const n = termMonths;

  // Monthly principal + interest installment (PMT formula)
  let monthlyInstallment;
  if (monthlyRate > 0) {
    monthlyInstallment = (principal * monthlyRate * Math.pow(1 + monthlyRate, n))
                         / (Math.pow(1 + monthlyRate, n) - 1);
  } else {
    monthlyInstallment = principal / n;
  }

  // Add monthly service fee to installment
  const totalMonthlyPayment = monthlyInstallment + fees.monthlyServiceFee;
  const totalRepayable = (totalMonthlyPayment * n) + fees.initiationFee;
  const totalInterest = totalRepayable - principal - fees.initiationFee - fees.totalServiceFees;

  return {
    principal,
    annualRate,
    termMonths,
    monthlyInstallment: parseFloat(monthlyInstallment.toFixed(2)),
    monthlyServiceFee: fees.monthlyServiceFee,
    totalMonthlyPayment: parseFloat(totalMonthlyPayment.toFixed(2)),
    initiationFee: fees.initiationFee,
    totalInterest: parseFloat(totalInterest.toFixed(2)),
    totalRepayable: parseFloat(totalRepayable.toFixed(2)),
    effectiveAnnualRate: annualRate,
    creditCategory: fees.category,
  };
};

// ─────────────────────────────────────────────
// NCA Affordability Check (Section 81)
// Credit provider MUST verify borrower can afford the loan
// "Reckless lending" = criminal liability if this is skipped
// ─────────────────────────────────────────────
const runAffordabilityCheck = ({
  netMonthlyIncome,
  totalMonthlyExpenses,
  totalExistingDebtPayments,
  proposedMonthlyPayment,
}) => {
  const disposableIncome = netMonthlyIncome - totalMonthlyExpenses - totalExistingDebtPayments;
  const debtServiceRatio = totalExistingDebtPayments / netMonthlyIncome * 100;

  // NCA guideline: debt obligations should not exceed 30-40% of net income
  // Lenda internal policy: max 35%
  const maxDebtRatio = 35;
  const maxAffordablePayment = disposableIncome * 0.5; // Max 50% of disposable

  const affordable = proposedMonthlyPayment <= maxAffordablePayment && disposableIncome > 0;
  const newDebtRatio = ((totalExistingDebtPayments + proposedMonthlyPayment) / netMonthlyIncome) * 100;

  return {
    netMonthlyIncome,
    totalMonthlyExpenses,
    totalExistingDebtPayments,
    disposableIncome: parseFloat(disposableIncome.toFixed(2)),
    currentDebtRatio: parseFloat(debtServiceRatio.toFixed(1)),
    newDebtRatio: parseFloat(newDebtRatio.toFixed(1)),
    maxAffordablePayment: parseFloat(maxAffordablePayment.toFixed(2)),
    proposedMonthlyPayment,
    affordable,
    recommendation: affordable
      ? 'Application meets NCA affordability requirements'
      : `Application fails affordability check. Proposed payment R${proposedMonthlyPayment} exceeds max affordable R${maxAffordablePayment.toFixed(2)}`,
    recklessLendingRisk: !affordable ? 'HIGH — do not proceed without review' : 'LOW',
  };
};

// ─────────────────────────────────────────────
// Generate Repayment Schedule
// ─────────────────────────────────────────────
const generateRepaymentSchedule = (principal, annualRate, termMonths, startDate, monthlyServiceFee = 0) => {
  const costs = calculateLoanCost(principal, annualRate, termMonths);
  const monthlyRate = annualRate / 100 / 12;
  const schedule = [];

  let balance = principal;
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + 1);

  for (let i = 1; i <= termMonths; i++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = costs.monthlyInstallment - interestPayment;
    balance -= principalPayment;

    schedule.push({
      installmentNo: i,
      dueDate: new Date(date).toISOString().split('T')[0],
      principal: parseFloat(principalPayment.toFixed(2)),
      interest: parseFloat(interestPayment.toFixed(2)),
      monthlyFee: monthlyServiceFee,
      totalDue: parseFloat((costs.monthlyInstallment + monthlyServiceFee).toFixed(2)),
      balance: parseFloat(Math.max(balance, 0).toFixed(2)),
    });

    date.setMonth(date.getMonth() + 1);
  }

  return schedule;
};

// ─────────────────────────────────────────────
// NCA Pre-Agreement Statement Template
// Must be provided to borrower 5 business days before signing
// ─────────────────────────────────────────────
const generatePreAgreementStatement = (loan, borrower) => {
  const costs = calculateLoanCost(loan.amount, loan.annualRate, loan.termMonths);
  const cooling_off_date = new Date();
  cooling_off_date.setDate(cooling_off_date.getDate() + 5); // 5 business days (simplified)

  return {
    title: 'Pre-Agreement Statement and Quotation',
    creditProvider: {
      name: 'Lenda (Pty) Ltd',
      ncr_registration: process.env.NCR_REGISTRATION_NUMBER,
      address: 'Johannesburg, Gauteng, South Africa',
    },
    borrower: {
      name: borrower.full_name,
      idNumber: borrower.sa_id_number,
      address: borrower.street_address,
    },
    creditDetails: {
      creditCategory: costs.creditCategory,
      principalDebt: `R ${costs.principal.toLocaleString()}`,
      interestRate: `${costs.annualRate}% per annum`,
      term: `${costs.termMonths} months`,
      monthlyInstallment: `R ${costs.totalMonthlyPayment.toFixed(2)}`,
      initiationFee: `R ${costs.initiationFee.toFixed(2)}`,
      monthlyServiceFee: `R ${costs.monthlyServiceFee.toFixed(2)}`,
      totalInterest: `R ${costs.totalInterest.toFixed(2)}`,
      totalCost: `R ${costs.totalRepayable.toFixed(2)}`,
    },
    ncaNotice: `This quotation is binding on Lenda (Pty) Ltd for 5 business days until ${cooling_off_date.toDateString()}.`,
    coolingOff: 'You have the right to cancel this agreement within 5 business days of signing without penalty.',
    recklessLending: 'You have the right to apply to court to have this agreement declared reckless if we failed to conduct a proper affordability assessment.',
    disputes: 'Contact the National Credit Regulator: 0860 627 627 | ncr.org.za',
    generatedAt: new Date().toISOString(),
    expiresAt: cooling_off_date.toISOString(),
  };
};

// ─────────────────────────────────────────────
// SA PROVINCES (for address validation)
// ─────────────────────────────────────────────
const SA_PROVINCES = [
  'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape',
  'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'Northern Cape',
];

// ─────────────────────────────────────────────
// NCR REGISTRATION REMINDER
// ─────────────────────────────────────────────
const NCR_REQUIREMENTS = `
IMPORTANT — NCR Registration Required:
Before Lenda can legally operate as a credit provider in South Africa, you must:

1. Register with the National Credit Regulator (NCR)
   - Website: ncr.org.za
   - Call: 0860 627 627
   - Application fee: R550 (non-refundable)
   - Branch fee: R250 per location
   - Annual renewal: due 31 July each year
   - Registration fee: based on total credit extended (9 categories, R1,000–R330,000)

2. Comply with FICA (Financial Intelligence Centre Act)
   - Implement KYC procedures
   - Report suspicious transactions to the FIC

3. Comply with POPIA (Protection of Personal Information Act)
   - Appoint an Information Officer
   - Register with the Information Regulator: inforegulator.org.za
   - Data subjects must consent to credit bureau checks

4. As a marketplace/intermediary, also consider:
   - FAIS (Financial Advisory and Intermediary Services Act) registration if giving financial advice
   - Banks Act compliance — ensure you are not inadvertently operating as a bank
   - NCR registration as a "reseller credit bureau" if pulling credit reports

Contact a South African financial services attorney before launch.
`;

module.exports = {
  NCA_INTEREST_CAPS,
  REPO_RATE,
  getCreditCategory,
  validateInterestRate,
  calculateNCAFees,
  calculateLoanCost,
  runAffordabilityCheck,
  generateRepaymentSchedule,
  generatePreAgreementStatement,
  SA_PROVINCES,
  NCR_REQUIREMENTS,
};