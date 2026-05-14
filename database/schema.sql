-- ============================================================
-- LENDFLOW — Global P2P Lending Marketplace
-- PostgreSQL Schema
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- USERS (All roles: borrower, lender, admin)
-- ─────────────────────────────────────────────
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email          VARCHAR(255) UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  role           VARCHAR(20) NOT NULL CHECK (role IN ('borrower', 'lender', 'admin')),
  full_name      VARCHAR(255) NOT NULL,
  phone          VARCHAR(30),
  country        VARCHAR(100) NOT NULL,
  status         VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_kyc', 'banned')),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- BORROWER PROFILES
-- ─────────────────────────────────────────────
CREATE TABLE borrower_profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth     DATE,
  employment_status VARCHAR(50) CHECK (employment_status IN ('employed', 'self_employed', 'unemployed', 'student', 'retired')),
  employer_name     VARCHAR(255),
  monthly_income    NUMERIC(12, 2),
  income_currency   VARCHAR(10) DEFAULT 'USD',
  credit_score      INTEGER,           -- internal platform score (0-1000)
  risk_grade        VARCHAR(5),        -- A, B, C, D, E
  bank_name         VARCHAR(255),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- LENDER PROFILES
-- ─────────────────────────────────────────────
CREATE TABLE lender_profiles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  investment_limit    NUMERIC(14, 2) DEFAULT 0,
  available_balance   NUMERIC(14, 2) DEFAULT 0,
  preferred_currency  VARCHAR(10) DEFAULT 'USD',
  preferred_countries TEXT[],          -- array of ISO country codes
  risk_appetite       VARCHAR(20) CHECK (risk_appetite IN ('conservative', 'moderate', 'aggressive')),
  is_accredited       BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- KYC VERIFICATIONS
-- ─────────────────────────────────────────────
CREATE TABLE kyc_verifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        VARCHAR(50) DEFAULT 'manual' CHECK (provider IN ('manual', 'onfido', 'sumsub', 'stripe')),
  status          VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'expired')),
  provider_ref    VARCHAR(255),        -- external reference ID from KYC provider
  id_type         VARCHAR(50),         -- passport, national_id, drivers_license
  id_number       VARCHAR(100),
  id_country      VARCHAR(100),
  selfie_url      TEXT,
  id_front_url    TEXT,
  id_back_url     TEXT,
  rejection_reason TEXT,
  reviewed_by     UUID REFERENCES users(id),
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ
);

-- ─────────────────────────────────────────────
-- LOAN APPLICATIONS
-- ─────────────────────────────────────────────
CREATE TABLE loan_applications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  borrower_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount          NUMERIC(12, 2) NOT NULL,
  currency        VARCHAR(10) DEFAULT 'USD',
  purpose         VARCHAR(100) NOT NULL CHECK (purpose IN ('business', 'education', 'medical', 'personal', 'home_improvement', 'debt_consolidation', 'other')),
  purpose_detail  TEXT,
  term_months     INTEGER NOT NULL CHECK (term_months IN (3, 6, 12, 18, 24, 36, 48, 60)),
  status          VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'listed', 'funded', 'active', 'completed', 'defaulted')),
  interest_rate   NUMERIC(5, 2),       -- annual % set by platform/admin
  monthly_payment NUMERIC(10, 2),
  admin_notes     TEXT,
  reviewed_by     UUID REFERENCES users(id),
  submitted_at    TIMESTAMPTZ,
  reviewed_at     TIMESTAMPTZ,
  funded_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- LOAN DOCUMENTS
-- ─────────────────────────────────────────────
CREATE TABLE loan_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  UUID NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  doc_type        VARCHAR(50) NOT NULL CHECK (doc_type IN ('bank_statement', 'payslip', 'tax_return', 'business_registration', 'utility_bill', 'other')),
  file_url        TEXT NOT NULL,
  file_name       VARCHAR(255),
  verified        BOOLEAN DEFAULT FALSE,
  verified_by     UUID REFERENCES users(id),
  uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- LOAN LISTINGS (Marketplace)
-- ─────────────────────────────────────────────
CREATE TABLE loan_listings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  UUID UNIQUE NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  title           VARCHAR(255),
  amount_needed   NUMERIC(12, 2) NOT NULL,
  amount_funded   NUMERIC(12, 2) DEFAULT 0,
  interest_rate   NUMERIC(5, 2) NOT NULL,
  term_months     INTEGER NOT NULL,
  risk_grade      VARCHAR(5),
  status          VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'partially_funded', 'fully_funded', 'closed', 'cancelled')),
  expires_at      TIMESTAMPTZ,
  listed_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INVESTMENTS (Lenders funding listings)
-- ─────────────────────────────────────────────
CREATE TABLE investments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id  UUID NOT NULL REFERENCES loan_listings(id) ON DELETE CASCADE,
  amount      NUMERIC(12, 2) NOT NULL,
  status      VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'repaid', 'defaulted', 'cancelled')),
  invested_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lender_id, listing_id)
);

-- ─────────────────────────────────────────────
-- REPAYMENT SCHEDULE
-- ─────────────────────────────────────────────
CREATE TABLE repayment_schedule (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  UUID NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  installment_no  INTEGER NOT NULL,
  due_date        DATE NOT NULL,
  principal       NUMERIC(10, 2) NOT NULL,
  interest        NUMERIC(10, 2) NOT NULL,
  total_due       NUMERIC(10, 2) NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'waived'))
);

-- ─────────────────────────────────────────────
-- PAYMENTS / TRANSACTIONS
-- ─────────────────────────────────────────────
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),
  type            VARCHAR(50) NOT NULL CHECK (type IN ('application_fee', 'investment', 'repayment', 'withdrawal', 'platform_fee', 'refund')),
  amount          NUMERIC(12, 2) NOT NULL,
  currency        VARCHAR(10) DEFAULT 'USD',
  direction       VARCHAR(10) NOT NULL CHECK (direction IN ('debit', 'credit')),
  reference_id    UUID,                -- loan_id, investment_id, etc.
  reference_type  VARCHAR(50),
  provider        VARCHAR(50),         -- stripe, wise, paypal
  provider_ref    VARCHAR(255),        -- payment provider transaction ID
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  description     TEXT,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- PLATFORM FEES
-- ─────────────────────────────────────────────
CREATE TABLE platform_fees (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_id  UUID NOT NULL,
  fee_type      VARCHAR(50) CHECK (fee_type IN ('application_fee', 'listing_fee', 'commission', 'premium_access')),
  amount        NUMERIC(10, 2) NOT NULL,
  currency      VARCHAR(10) DEFAULT 'USD',
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'waived')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  type        VARCHAR(50) CHECK (type IN ('info', 'success', 'warning', 'error', 'kyc', 'loan', 'payment')),
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- AUDIT / ADMIN LOGS
-- ─────────────────────────────────────────────
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id      UUID REFERENCES users(id),
  action        VARCHAR(100) NOT NULL,
  target_type   VARCHAR(50),           -- user, loan, kyc, etc.
  target_id     UUID,
  old_value     JSONB,
  new_value     JSONB,
  ip_address    INET,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_loan_apps_borrower ON loan_applications(borrower_id);
CREATE INDEX idx_loan_apps_status ON loan_applications(status);
CREATE INDEX idx_loan_listings_status ON loan_listings(status);
CREATE INDEX idx_investments_lender ON investments(lender_id);
CREATE INDEX idx_investments_listing ON investments(listing_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_kyc_user ON kyc_verifications(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);

-- ─────────────────────────────────────────────
-- TRIGGERS — auto-update updated_at
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_borrower_updated BEFORE UPDATE ON borrower_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_lender_updated BEFORE UPDATE ON lender_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_loans_updated BEFORE UPDATE ON loan_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();