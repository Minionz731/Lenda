# 🇿🇦 Lenda — South African P2P Lending Marketplace

A full-stack peer-to-peer lending platform built for South Africa. Connects borrowers and lenders with built-in identity verification via the Department of Home Affairs (DHA), SA credit bureau integration, and local bank payment rails.

**Version**: 1.0.0 (In Development)
**Last Updated**: May 2026

---

## Table of Contents

- [Project Structure](#project-structure)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Database Setup](#database-setup)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Security](#security)
- [SA Compliance](#sa-compliance)
- [Contributing](#contributing)
- [License](#license)

---

## Project Structure

```
Lenda/
├── backend/
│   ├── config/
│   │   └── db.js                  # PostgreSQL connection pool
│   ├── controllers/
│   │   ├── auth.controller.js     # Register, login, token refresh
│   │   ├── loan.controller.js     # Full loan lifecycle
│   │   └── kyc.controller.js      # SA Home Affairs verification
│   ├── middleware/
│   │   └── auth.js                # JWT auth + role guards + KYC gate
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── borrower.routes.js
│   │   ├── lender.routes.js
│   │   ├── admin.routes.js
│   │   ├── kyc.routes.js
│   │   ├── marketplace.routes.js
│   │   ├── payment.routes.js
│   │   └── notification.routes.js
│   ├── services/
│   │   ├── datanamix.service.js   # DHA + SAFPS + credit bureaus
│   │   ├── stitch.service.js      # SA bank payments + disbursements
│   │   ├── ozow.service.js        # EFT payments + application fees
│   │   └── nca.service.js         # NCA compliance + rate caps
│   ├── uploads/                   # Document uploads (not committed)
│   ├── .env.example
│   ├── .eslintrc.js
│   ├── jest.config.js
│   ├── jest.setup.js
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx         # Sidebar + topbar (all 3 roles)
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Global auth state + axios interceptors
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── NotFound.jsx
│   │   │   ├── borrower/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── Apply.jsx      # 3-step loan application wizard
│   │   │   │   ├── Loans.jsx      # Application tracker
│   │   │   │   └── KYC.jsx        # SA ID + selfie + bank verification
│   │   │   ├── lender/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── Marketplace.jsx
│   │   │   │   ├── Investments.jsx
│   │   │   │   └── KYC.jsx
│   │   │   └── admin/
│   │   │       ├── Dashboard.jsx
│   │   │       ├── Loans.jsx      # Approve / reject applications
│   │   │       ├── Users.jsx
│   │   │       ├── KYC.jsx        # KYC review queue
│   │   │       └── Analytics.jsx
│   │   ├── App.jsx                # Routes + role-based auth guards
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── package.json
├── database/
│   └── schema.sql                 # Full PostgreSQL schema (12 tables)
├── .github/
│   └── workflows/
│       ├── backend-ci.yml
│       └── frontend-ci.yml
├── .gitignore
├── .env.example
├── API.md
├── CONTRIBUTING.md
├── SECURITY.md
└── README.md
```

---

## Features

### Three User Roles
- **Borrower** — Apply for loans, upload documents, track applications, view repayment schedule
- **Lender** — Browse marketplace, invest in loans, track portfolio
- **Admin** — Review KYC, approve/reject loans, manage users, view analytics

### SA Identity Verification
- 13-digit SA ID number validation with live decode (DOB, gender, citizenship)
- Realtime Department of Home Affairs (DHA) verification via Datanamix
- Selfie + biometric face match against DHA photo
- SAFPS fraud prevention registry check
- Bank account AVS (Account Verification Service)

### SA Credit Bureaus
- TransUnion SA
- Experian SA
- XDS (100% Black-owned, B-BBEE Level 1)
- Composite credit score + risk grading (A–E)

### SA Payment Rails
- **Stitch** — Pay by Bank, Capitec Pay, Absa Pay, FNB Direct, loan disbursements, DebiCheck debit orders
- **Ozow** — Application fees, lender wallet top-ups (47M+ SA bank account holders)

### NCA Compliance
- Interest rate caps enforced per loan category
- Mandatory affordability assessment (Section 81)
- Pre-agreement statement with 5-day cooling-off
- Monthly credit bureau reporting

---

## Prerequisites

- Node.js v18+
- PostgreSQL v14+
- npm

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Minionz731/Lenda.git
cd Lenda
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

---

## Configuration

### Backend Environment Variables

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and fill in your values:

```bash
# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/lenda

# JWT (generate long random strings)
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Datanamix — DHA + Credit Bureaus (datanamix.com)
DATANAMIX_API_KEY=your_key
DATANAMIX_SUBSCRIBER_ID=your_id

# Stitch — SA Payments (stitch.money)
STITCH_CLIENT_ID=your_client_id
STITCH_CLIENT_SECRET=your_client_secret
STITCH_WEBHOOK_SECRET=your_webhook_secret

# Ozow — EFT Payments (ozow.com)
OZOW_SITE_CODE=your_site_code
OZOW_PRIVATE_KEY=your_private_key
OZOW_API_KEY=your_api_key

# SA Regulatory
NCR_REGISTRATION_NUMBER=NCRCP_PENDING
SARB_REPO_RATE=8.25
```

### Frontend Environment Variables

Create `frontend/.env`:

```bash
VITE_API_URL=http://localhost:5000/api
```

---

## Running the Application

### Start Backend (Terminal 1)

```bash
cd backend
npm run dev
```

API runs on `http://localhost:5000`
Health check: `http://localhost:5000/health`

### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

App runs on `http://localhost:5173`

### Production

```bash
# Frontend build
cd frontend && npm run build

# Backend
cd backend && npm start
```

---

## Database Setup

### Schema Overview

The database has 12 tables:

| Table | Purpose |
|-------|---------|
| `users` | All roles — borrower, lender, admin |
| `borrower_profiles` | Income, employment, credit score, bank details |
| `lender_profiles` | Balance, risk appetite, bank details |
| `kyc_verifications` | DHA + SAFPS + biometric + AVS results |
| `credit_reports` | TransUnion, Experian, XDS bureau reports |
| `affordability_assessments` | NCA Section 81 affordability checks |
| `loan_applications` | Full loan lifecycle (draft → funded) |
| `loan_documents` | Supporting documents per application |
| `loan_listings` | Marketplace listings for approved loans |
| `investments` | Lender investments per listing |
| `repayment_schedule` | Monthly installment schedule |
| `transactions` | All financial movements (ZAR) |
| `platform_fees` | Revenue tracking |
| `notifications` | In-app alerts |
| `audit_logs` | Admin action history |

### Create and Migrate

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE lenda;"

# Run the schema
cd backend
npm run migrate
```

### Verify Tables

```bash
psql -U postgres -d lenda -c "\dt"
```

---

## API Documentation

Full API reference is in [API.md](./API.md).

### Auth (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Create borrower or lender account |
| POST | `/login` | Authenticate + get JWT tokens |
| POST | `/refresh` | Refresh access token |
| GET | `/me` | Get current user profile |
| PUT | `/change-password` | Update password |

### Borrower (`/api/borrower`) — requires auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT | `/profile` | View/update profile |
| POST | `/loans` | Create loan application |
| PUT | `/loans/:id/submit` | Submit for review |
| GET | `/loans` | My applications |
| POST | `/loans/:id/documents` | Upload document |

### Lender (`/api/lender`) — requires auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/marketplace` | Browse open listings |
| POST | `/marketplace/:id/invest` | Place investment |
| GET | `/investments` | My portfolio |

### Admin (`/api/admin`) — requires admin role

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | All users |
| PUT | `/users/:id/status` | Suspend/activate/ban |
| GET | `/loans` | All applications |
| PUT | `/loans/:id/approve` | Approve + set interest rate |
| PUT | `/loans/:id/reject` | Reject with reason |
| GET | `/kyc` | KYC review queue |
| PUT | `/kyc/:id/approve` | Approve KYC |
| PUT | `/kyc/:id/reject` | Reject KYC |
| GET | `/analytics` | Platform statistics |

### KYC (`/api/kyc`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/submit` | Submit SA ID + address + bank |
| POST | `/selfie` | Upload selfie for face match |
| GET | `/status` | Current KYC status |
| POST | `/credit-check` | Pull credit bureau reports |

---

## Testing

```bash
cd backend

# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run linter
npm run lint
```

---

## Security

- **Passwords**: bcryptjs with 12 salt rounds
- **Auth**: JWT access tokens (15min) + refresh tokens (7 days)
- **Headers**: Helmet.js HTTP security headers
- **CORS**: Restricted to frontend origin
- **Rate limiting**: 100 req/15min global, 20 req/15min on auth routes
- **Input validation**: express-validator on all POST/PUT routes
- **Role guards**: borrower / lender / admin middleware
- **KYC gate**: Sensitive actions blocked until identity verified

⚠️ **Never commit `.env`** — it's in `.gitignore`
⚠️ Change `JWT_SECRET` before going to production
⚠️ Enable HTTPS in production

See [SECURITY.md](./SECURITY.md) for full security policy.

---

## SA Compliance

Before Lenda can legally operate in South Africa:

| Requirement | Body | Link |
|------------|------|------|
| NCR Registration (credit provider) | National Credit Regulator | ncr.org.za |
| POPIA Information Officer | Information Regulator | inforegulator.org.za |
| FICA compliance policy | Financial Intelligence Centre | fic.gov.za |
| NCA-compliant loan agreements | SA attorney review | — |

**NCA Interest Rate Caps** (enforced in `nca.service.js`):

| Category | Cap |
|----------|-----|
| Short-term (≤ R8k, ≤ 6 months) | 5% per month |
| Small credit (≤ R15k, ≤ 12 months) | 5×Repo + 21% |
| Unsecured personal loans | 2.2×Repo + 20% |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run linter: `npm run lint`
6. Commit: `git commit -m "feat: your feature description"`
7. Push: `git push origin feature/your-feature`
8. Open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full guidelines.

---

## License

ISC License — see [LICENSE](./LICENSE) for details.

---

## Support

Open a GitHub issue at [github.com/Minionz731/Lenda/issues](https://github.com/Minionz731/Lenda/issues)