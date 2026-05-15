# Lenda - Lending Management System

A full-stack web application for managing lending operations with a React frontend and Node.js/Express backend.

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
- [Contributing](#contributing)
- [License](#license)

## Project Structure

```
Lenda/
├── backend/              # Express.js API server
│   ├── src/
│   ├── package.json
│   └── server.js
├── frontend/             # React + Vite application
│   ├── src/
│   ├── public/
│   └── package.json
├── database/             # PostgreSQL schemas and migrations
│   ├── schema.sql
│   └── migrations/
├── .gitignore
├── .env.example
└── README.md
```

## Features

- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing
- **Lending Management**: Create and manage loan accounts
- **User Management**: Admin and user role-based access control
- **Dashboard**: Real-time lending analytics and statistics
- **API Security**: Rate limiting, input validation, and CORS protection
- **Responsive Design**: Mobile-friendly React UI with Tailwind CSS

## Prerequisites

- Node.js (v18+ recommended)
- PostgreSQL (v12+)
- npm or yarn

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
cd ..
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

## Configuration

### 1. Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your actual configuration:

```
DATABASE_URL=postgresql://user:password@localhost:5432/lenda_db
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_key_here
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:5173
```

### 2. Database Setup

Ensure PostgreSQL is running, then initialize the database:

```bash
cd backend
npm run migrate
cd ..
```

This command runs `database/schema.sql` to set up tables and initial schema.

## Running the Application

### Start Backend Server

```bash
cd backend
npm run dev
```

The API server runs on `http://localhost:5000`

### Start Frontend Development Server

In a new terminal:

```bash
cd frontend
npm run dev
```

The frontend runs on `http://localhost:5173`

### Production Build

Frontend:
```bash
cd frontend
npm run build
```

Backend:
```bash
cd backend
npm start
```

## Database Setup

### Schema Overview

The database includes tables for:
- **users**: User accounts with authentication
- **loans**: Loan account information
- **transactions**: Loan transaction history
- **audit_logs**: System audit trail

### Running Migrations

```bash
cd backend
npm run migrate
```

To create a new migration:
```bash
psql $DATABASE_URL -f database/migrations/your_migration.sql
```

## API Documentation

### Authentication Endpoints

**POST** `/api/auth/register`
- Register a new user
- Body: `{ email, password, firstName, lastName }`

**POST** `/api/auth/login`
- User login
- Body: `{ email, password }`
- Returns: JWT token

**POST** `/api/auth/logout`
- User logout (client-side token removal)

### Lending Endpoints

**GET** `/api/loans`
- Get all loans (requires authentication)

**POST** `/api/loans`
- Create a new loan
- Body: `{ borrowerId, amount, term, interestRate }`

**GET** `/api/loans/:id`
- Get loan details

**PUT** `/api/loans/:id`
- Update loan information

### User Endpoints

**GET** `/api/users/profile`
- Get current user profile

**PUT** `/api/users/profile`
- Update user profile

**GET** `/api/users`
- Get all users (admin only)

For detailed API documentation, see [API.md](./API.md) (coming soon).

## Testing

Run the test suite:

```bash
cd backend
npm test
```

Run tests with coverage:

```bash
cd backend
npm run test:coverage
```

Frontend tests:

```bash
cd frontend
npm run test
```

## Security

This application implements several security best practices:

- **Password Security**: Passwords are hashed using bcryptjs (10 salt rounds)
- **JWT Tokens**: Stateless authentication with expiring tokens
- **CORS**: Restricted to specified origins
- **Rate Limiting**: API endpoints are rate-limited to prevent abuse
- **Input Validation**: All inputs are validated server-side
- **Helmet**: HTTP headers are secured with Helmet.js
- **Environment Variables**: Sensitive data is stored in .env (never committed)

### Important Security Notes

⚠️ **Do NOT commit `.env` files to version control**
- Copy `.env.example` and configure locally
- Change `JWT_SECRET` in production
- Use strong, unique passwords
- Enable HTTPS in production

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m "Add your feature"`
3. Push to branch: `git push origin feature/your-feature`
4. Submit a Pull Request

Please ensure:
- All tests pass: `npm test`
- Code is linted: `npm run lint`
- Commit messages are descriptive
- Changes are documented

## License

This project is licensed under the ISC License - see LICENSE file for details.

## Support

For issues, questions, or suggestions, please open a GitHub issue.

---

**Last Updated**: May 15, 2026
**Version**: 1.0.0 (In Development)
