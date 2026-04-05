# Financial Ledger & RBAC Backend

A high-integrity financial data processing system built with **Node.js**, **Express**, and **MongoDB**. Designed around a double-entry bookkeeping model, every money movement in this system is recorded as two opposing ledger entries — making the audit trail mathematically verifiable and impossible to silently corrupt.

---

## Why This Architecture?

Most CRUD-based finance apps store a single `balance` field on a user record. That's fine for simple apps, but it creates a dangerous blind spot: if a bug or crash updates one account and not the other, money silently vanishes. This system takes the approach used by banks — the **double-entry ledger** — where every transaction produces two entries that must always sum to zero. If they don't, something went wrong, and we can prove it from the record.

---

## Core Concepts

### The Double-Entry Ledger

Every financial transfer in the system produces exactly **two ledger entries**: a **DEBIT** on the sender's side and a **CREDIT** on the receiver's side. The `Transaction` model records the intent (who sent what to whom), while the `Ledger` model records the facts.

This separation matters for auditing. If a user's displayed balance ever looks wrong, you don't have to trust the balance field — you can replay the entire ledger history and recalculate it from scratch. The two numbers must agree.

### Atomic Transactions (No Ghost Money)

Consider what happens without atomicity: the debit succeeds, the server crashes, and the receiver never gets credited. The money is gone from the sender but never arrives. This system wraps every transfer in a **MongoDB ACID transaction** (`session.startTransaction()`). If the debit, credit, or email notification fails at the database level, the entire operation is rolled back via `session.abortTransaction()`. Nothing is committed unless everything succeeds.

### Idempotency

Network retries and accidental double-submits are real. Every transaction requires a caller-supplied `idempotencyKey`, and the database enforces a **unique index** on that field. Submitting the same request twice produces one transaction, not two. This is the same pattern used by Stripe and most financial-grade APIs.

---

## Role-Based Access Control (RBAC)

The system enforces a three-tier permission hierarchy through custom Express middleware. Roles are not checked on the frontend — every protected route validates the JWT and the caller's role on the server before touching any data.

| Role | What They Can Do |
|---|---|
| **Admin** | Full CRUD, user management, system-wide analytics |
| **Analyst** | Read-only access to aggregated financial summaries |
| **Viewer** | Can only view their own transaction history |

### User Status Guard

Role alone isn't enough. A user flagged as `INACTIVE` is blocked at the middleware layer regardless of their role — they cannot log in or initiate any transaction. This handles scenarios like account suspension or offboarding without needing to delete any data.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (via Mongoose)
- **Auth:** JWT (JSON Web Tokens)
- **Email:** Gmail via OAuth2 (no raw SMTP passwords stored)
- **Financial Safety:** Mongoose Sessions (ACID transactions)

---

## Project Structure

```
├── models/
│   ├── User.js          # Identity, role, and status
│   ├── Account.js       # Currency and user mapping
│   ├── Transaction.js   # Parent record for every transfer
│   └── Ledger.js        # Granular debit/credit audit entries
├── middleware/
│   ├── auth.js          # JWT verification
│   └── rbac.js          # Role and status enforcement
├── routes/
│   ├── auth.js          # Login
│   ├── transactions.js  # Transfer logic and history
│   └── dashboard.js     # Aggregated analytics
├── services/
│   └── mailer.js        # OAuth2 Gmail notifications
└── server.js
```

---

## API Reference

### Authentication

```
POST /api/auth/login
```
Authenticates a user and returns a signed JWT. Users with `INACTIVE` status are rejected at this step.

---

### Transactions

All transaction endpoints require a valid JWT. Role requirements are noted per route.

```
POST /api/transactions
```
Executes a funds transfer between two accounts. Requires `ADMIN` role. The request body must include an `idempotencyKey` to prevent duplicate processing. Triggers an asynchronous email notification to both parties on success.

```
GET /api/transactions/my-history
```
Returns the authenticated user's transaction history. Available to all roles. Supports query-string filtering by date range and category.

```
DELETE /api/transactions/:id
```
Reverses a transaction by creating compensating ledger entries. Requires `ADMIN` role. The original entries are never deleted — the reversal is recorded as a new event in the ledger.

---

### Dashboard

```
GET /api/dashboard/summary
```
Returns system-wide financial aggregates: total income, total expenses, and net balance. Restricted to `ADMIN` and `ANALYST` roles. Powered by MongoDB's aggregation pipeline — data is processed server-side in a single pass rather than loading thousands of records into memory.

---

## Analytics Pipeline

The dashboard summary uses MongoDB's aggregation framework with three stages:

- **`$match`** — Filters the dataset by user or date range before any computation
- **`$group`** — Calculates total income, total expenses, and net balance in one pass
- **`$sort`** — Returns the most recent activity first for real-time monitoring

This approach scales well. A naive implementation that loads all records and reduces them in JavaScript will fall over at volume. The aggregation pipeline keeps the heavy lifting inside the database engine.

---

## Email Notifications

Outgoing emails use **OAuth2** against the Gmail API. This means no raw SMTP password is stored in environment variables — only the `ClientId`, `ClientSecret`, and `RefreshToken`, which can be revoked independently of the account password.

Email sends are intentionally **non-blocking**. The HTTP response is returned to the client immediately, and the email is dispatched as a background task (`.catch()` handles any mail failures silently so they don't surface as API errors). A slow or temporarily unavailable mail server has zero impact on transaction response time.

---

## How a Transfer Flows Through the System

```
POST /api/transactions
        │
        ▼
┌───────────────────┐
│   Auth Middleware │  ← Verifies JWT, rejects INACTIVE users
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│   RBAC Middleware │  ← Confirms caller has ADMIN role
└────────┬──────────┘
         │
         ▼
┌─────────────────────────────────────┐
│     MongoDB ACID Transaction        │
│                                     │
│  1. Validate idempotencyKey         │
│  2. Write Transaction (intent)      │
│  3. Write Ledger DEBIT  (sender)    │
│  4. Write Ledger CREDIT (receiver)  │
│                                     │
│  ✓ All succeed → commit             │
│  ✗ Any fail   → rollback            │
└────────┬────────────────────────────┘
         │
         ▼
┌───────────────────┐
│  Email (async)    │  ← Fires in background, never blocks response
└───────────────────┘
```

---

## Setup

### Prerequisites

| Requirement | Version / Notes |
| :--- | :--- |
| Node.js | v18.x or higher |
| MongoDB | v6.0+ — **Replica Set required** for ACID transactions (Atlas works out of the box) |
| Gmail Account | OAuth2 credentials (Client ID, Secret, Refresh Token) |
| Postman | Recommended for API testing |

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root:

```env
PORT=3000
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_secure_secret
EMAIL_USER=your_gmail_address
CLIENT_ID=google_oauth_client_id
CLIENT_SECRET=google_oauth_client_secret
REFRESH_TOKEN=google_oauth_refresh_token
```

> **Note on MongoDB:** If running locally instead of Atlas, initialize a single-node replica set first with `rs.initiate()` in the Mongo shell. Without a replica set, `session.startTransaction()` will throw.

3. Start the development server:

```bash
npm run dev
```

> Requires `nodemon` — make sure your `package.json` includes `"dev": "nodemon server.js"` under `scripts`.

### Testing with Postman

An exported Postman collection is included in the `/docs` folder. Import `Fintech-v1.json` to get pre-configured requests for Auth, Transactions, and the Dashboard — including example bodies with `idempotencyKey` already set.

---

## Data Model Overview

**User** — Stores credentials, role (`ADMIN` / `ANALYST` / `VIEWER`), and status (`ACTIVE` / `INACTIVE`).

**Account** — Holds currency type and a reference to the owning User. A user can have multiple accounts.

**Transaction** — The parent record for every transfer. Stores sender, receiver, amount, category, timestamp, and the idempotency key.

**Ledger** — One-to-many child records of a Transaction. Each transaction produces exactly two: one DEBIT and one CREDIT. These are the source of truth for balances.

---

## Security Notes

- JWTs are verified on every protected request — no session state is stored server-side.
- Role checks happen in middleware before any business logic runs.
- The `INACTIVE` status check is evaluated independently of role, so a suspended admin cannot bypass it.
- Idempotency keys are indexed with a unique constraint at the database level, not enforced in application code alone.
- OAuth2 tokens for Gmail can be revoked from Google's security dashboard without changing the application's password.
