# APX Desk

> **B2B Distribution Management Platform** — end-to-end operations for fertilizer distributors. Manage retailer orders, warehouse receipts, inventory batches, dispatch workflows, and financial ledgers from a single dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Vanilla CSS, React Query v5, Zustand |
| Backend | Node.js 18, Express.js, Socket.IO |
| Database | PostgreSQL 15 |
| Cache / Queues | Redis 7, BullMQ |
| Auth | JWT (rotating access + refresh tokens), RBAC |
| Storage | S3-compatible (AWS S3 / MinIO) |

---

## Project Structure

```
apx-desk/
├── backend/            # Express API server
│   ├── migrations/     # SQL migration files (run in order)
│   ├── src/
│   │   ├── config/     # DB, Redis, env config
│   │   ├── jobs/       # Background jobs (reservation reaper, expiry scanner)
│   │   ├── middleware/ # Auth, RBAC, audit logger, rate limiter
│   │   └── modules/    # Feature modules (auth, orders, warehouse, finance…)
│   └── .env.example
├── database/           # Schema, seed data, utility SQL
├── frontend/           # Next.js application
│   ├── src/
│   │   ├── app/        # App Router pages
│   │   ├── components/ # Shared UI components
│   │   ├── store/      # Zustand auth store
│   │   └── lib/        # Axios API client (with auto token refresh)
│   └── .env.local.example
└── docker-compose.yml
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose

### 1. Start Infrastructure
```bash
docker-compose up -d
```
Starts PostgreSQL on port `5433` and Redis on port `6379`.

### 2. Initialize Database
```bash
# Run the base schema
psql -U fdms_user -d fdms_db -f database/schema.sql

# Run seed data
psql -U fdms_user -d fdms_db -f database/seed.sql

# Run all migrations in order
for f in backend/migrations/*.sql; do
  echo "Running $f..."
  psql -U fdms_user -d fdms_db -f "$f"
done
```

### 3. Start Backend
```bash
cd backend
cp .env.example .env
# Fill in JWT secrets, DB URL, Redis URL
npm install
npm run dev
```
API server runs on `http://localhost:4000`

### 4. Start Frontend
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```
Frontend runs on `http://localhost:3001`

---

## Demo Credentials

> ⚠️ Change all passwords before deploying to production.

| Role | Email | Password |
|---|---|---|
| Admin | admin@fdms.com | Admin@123 |
| Sales Executive | sales@fdms.com | Sales@123 |
| Warehouse Manager | warehouse@fdms.com | Warehouse@123 |
| Retailer | retailer@fdms.com | Retail@123 |

---

## Role Permissions

| Feature | Admin | Sales | WH Manager | Retailer |
|---|---|---|---|---|
| User Management | ✅ | ❌ | ❌ | ❌ |
| Business Management | ✅ | ✅ | ❌ | ❌ |
| Product Catalog | ✅ | ✅ | View | View |
| Pricing Management | ✅ | ✅ | ❌ | ❌ |
| Place Orders | ✅ | ✅ | ❌ | ✅ |
| Confirm / Cancel Orders | ✅ | ✅ | ❌ | ❌ |
| Inventory Batches | ✅ | ❌ | ✅ | ❌ |
| Create GRN | ✅ | ❌ | ✅ | ❌ |
| Approve GRN | ✅ | ✅ | ❌ | ❌ |
| Create Dispatch | ✅ | ❌ | ❌ | ❌ |
| Execute Dispatch | ❌ | ❌ | ✅ | ❌ |
| Mark Delivered | ✅ | ❌ | ✅ | ❌ |
| Financial Ledger | ✅ | ❌ | ❌ | Own only |
| Record Payments | ✅ | ✅ | ❌ | ❌ |
| Invoices | ✅ | ✅ | ❌ | Own only |
| Audit Logs | ✅ | ❌ | ❌ | ❌ |

---

## Key Architecture

### GRN (Goods Receipt Note) — Two-Step Workflow
```
Warehouse Manager creates GRN
        ↓
  [pending_approval]
        ↓
Admin / Sales approves or rejects
        ↓
  [approved] → inventory batches created
  [rejected] → no stock movement
```

### Dispatch — Two-Step Workflow
```
Admin creates dispatch (vehicle no., driver name, phone required)
        ↓
  [pending_dispatch] → inventory NOT yet deducted
        ↓
Warehouse Manager executes dispatch
        ↓
  [in_transit] → inventory reservations committed
        ↓
Mark Delivered → [delivered]
```

### Inventory
- **Batch-first** — every stock movement tracked at batch level (`inventory_batches`)
- **FEFO** — batches consumed in First-Expired-First-Out order (DB index enforced)
- **Reservation system** — stock soft-locked on order confirmation, committed on dispatch
- **Reservation reaper** — background job releases expired soft-locks hourly

### Financial Ledger
- **Append-only** — no `UPDATE` or `DELETE` on `credit_ledger`
- **Balance = computed** — `SUM(credits) - SUM(debits)`, no stored balance column
- **Credit limit** — enforced at order placement; checked against available balance

### Order State Machine
```
PENDING → CONFIRMED → PROCESSING → DISPATCHED → DELIVERED
        ↘                       ↗
          CANCELLED (from PENDING or CONFIRMED only)
```

### Security
- JWT access tokens (15 min) + rotating refresh tokens (7 days), stored as SHA-256 hash
- Redis user cache (5 min TTL) with instant invalidation on logout / suspension
- **Login rate limiter** — 10 failed attempts per user per 15-minute window (Redis-backed)
- Role guards on every API route; `helmet`, `cors`, global rate limiter
- All mutations logged to `audit_logs` with before/after state

### API Conventions
```json
// Success
{ "success": true, "data": {}, "message": "OK", "meta": { "page": 1, "total": 42 } }

// Error
{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "..." } }
```
Pagination: `?page=1&limit=20`

---

## Background Jobs

| Job | Schedule | Purpose |
|---|---|---|
| Reservation Reaper | Hourly | Releases expired stock soft-locks (uncommitted reservations) |
| Expiry Scanner | Daily | Flags batches expiring within 30 days |

---

## Environment Variables

Copy and fill in:
- `backend/.env.example` → `backend/.env`
- `frontend/.env.local.example` → `frontend/.env.local`

Generate JWT secrets:
```bash
openssl rand -hex 64   # JWT_SECRET
openssl rand -hex 64   # JWT_REFRESH_SECRET
```

---

## Deployment

See [deployment guide](./docs/deployment.md) for the recommended stack:
- **Frontend** → Vercel (Mumbai CDN edge)
- **Backend** → DigitalOcean App Platform (Bangalore)
- **PostgreSQL** → DigitalOcean Managed DB (Bangalore)
- **Redis** → Upstash (Mumbai)

---

## License

Private — All rights reserved © APX Desk
