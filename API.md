# Lenda API Documentation

## Base URL

```
http://localhost:5000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Response Format

All responses are JSON:

```json
{
  "success": true,
  "data": { /* response data */ },
  "error": null
}
```

## Error Responses

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

## Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Endpoints

### Health Check

#### GET /health

Check if the API is running.

**Response:**
```json
{
  "status": "OK",
  "message": "Server is running"
}
```

### Authentication (Coming Soon)

#### POST /auth/register

Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### POST /auth/login

User login.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "expiresIn": "7d",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "user"
    }
  }
}
```

### Loans (Coming Soon)

#### GET /loans

Get all loans (requires authentication).

**Query Parameters:**
- `status` - Filter by loan status (pending, approved, active, completed, defaulted)
- `limit` - Number of results (default: 20, max: 100)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "loans": [
      {
        "id": "uuid",
        "amount": 5000,
        "interestRate": 12.5,
        "term": 24,
        "status": "active",
        "borrowerId": "uuid",
        "createdAt": "2026-05-15T10:00:00Z"
      }
    ],
    "total": 1,
    "limit": 20,
    "offset": 0
  }
}
```

#### POST /loans

Create a new loan (requires authentication).

**Request Body:**
```json
{
  "borrowerId": "uuid",
  "amount": 5000,
  "interestRate": 12.5,
  "term": 24
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "borrowerId": "uuid",
    "amount": 5000,
    "interestRate": 12.5,
    "term": 24,
    "status": "pending",
    "createdAt": "2026-05-15T10:00:00Z"
  }
}
```

#### GET /loans/:id

Get loan details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "borrowerId": "uuid",
    "amount": 5000,
    "interestRate": 12.5,
    "term": 24,
    "status": "active",
    "startDate": "2026-05-15T10:00:00Z",
    "endDate": "2028-05-15T10:00:00Z",
    "createdAt": "2026-05-15T10:00:00Z",
    "updatedAt": "2026-05-15T10:00:00Z"
  }
}
```

#### PUT /loans/:id

Update loan information (requires authentication).

**Request Body:**
```json
{
  "status": "approved",
  "interestRate": 11.5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "borrowerId": "uuid",
    "amount": 5000,
    "interestRate": 11.5,
    "term": 24,
    "status": "approved",
    "updatedAt": "2026-05-15T11:00:00Z"
  }
}
```

### Users (Coming Soon)

#### GET /users/profile

Get current user profile (requires authentication).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "status": "active",
    "createdAt": "2026-05-15T10:00:00Z",
    "lastLogin": "2026-05-15T10:00:00Z"
  }
}
```

#### PUT /users/profile

Update user profile (requires authentication).

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "updatedAt": "2026-05-15T11:00:00Z"
  }
}
```

## Rate Limiting

API endpoints are rate-limited to 100 requests per 15 minutes.

Response headers include:
- `X-RateLimit-Limit` - Requests allowed
- `X-RateLimit-Remaining` - Requests remaining
- `X-RateLimit-Reset` - Time when limit resets (Unix timestamp)

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `limit` - Results per page (default: 20, max: 100)
- `offset` - Number of results to skip (default: 0)

**Response Includes:**
- `data` - Array of results
- `total` - Total number of records
- `limit` - Results per page used
- `offset` - Offset used

---

**API Version:** 1.0.0 (In Development)
**Last Updated:** May 15, 2026

For detailed implementation of these endpoints, check the source code in `backend/src/routes/`
