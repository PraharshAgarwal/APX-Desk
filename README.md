# 🌱 FDMS — Fertilizer Distribution Management System

A full-stack B2B platform for managing fertilizer distribution — from retailer orders to warehouse operations, inventory batches, and financial ledgers.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TailwindCSS, React Query, Zustand |
| Backend | Node.js, Express.js, Socket.IO |
| Database | PostgreSQL 15 |
| Cache / Queues | Redis 7, BullMQ |
| Auth | JWT (access + refresh), RBAC |
| Storage | S3-compatible (AWS S3 / MinIO) |

---

## Project Structure

```
fdms/
├── backend/          # Express API server
├── database/         # PostgreSQL schema + seed data
├── frontend/         # Next.js application
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
This starts PostgreSQL (port 5432) and Redis (port 6379).

### 2. Initialize Database
```bash
psql -U fdms_user -d fdms_db -f database/schema.sql
psql -U fdms_user -d fdms_db -f database/seed.sql
```

### 3. Start Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your secrets
npm install
npm run dev
```
Backend runs on `http://localhost:4000`

### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@fdms.com | Admin@123 |
| Retailer | retailer@fdms.com | Retail@123 |
| Warehouse Manager | warehouse@fdms.com | Warehouse@123 |
| Sales Executive | sales@fdms.com | Sales@123 |

---

## Role Permissions

| Feature | Admin | Retailer | WH Manager | Sales |
|---------|-------|----------|------------|-------|
| User Management | ✅ | ❌ | ❌ | ❌ |
| Product Catalog | ✅ | 👁️ | 👁️ | ✅ |
| Pricing Management | ✅ | ❌ | ❌ | ✅ |
| Place Orders | ✅ | ✅ | ❌ | ✅ |
| Inventory Batches | ✅ | ❌ | ✅ | ❌ |
| GRN / Dispatch | ✅ | ❌ | ✅ | ❌ |
| Financial Ledger | ✅ | 👁️ (own) | ❌ | ❌ |
| Audit Logs | ✅ | ❌ | ❌ | ❌ |

---

## Key Architecture Decisions

### Inventory (CRITICAL)
- **Batch-first**: Every stock movement is at the batch level (`inventory_batches`)
- **FEFO enforcement**: Batches are always consumed in order of earliest expiry date
- **Reservation system**: Stock is reserved on order confirmation, committed on dispatch
  - `inventory_reservations` table holds soft-locks
  - Prevents overselling under concurrent load

### Financial Ledger
- **Append-only**: No `UPDATE` or `DELETE` on `credit_ledger`
- **Balance = computed**: `SUM(credits) - SUM(debits)` — no stored balance column
- **All payments create ledger entries** — complete audit trail

### Order State Machine
```
PENDING → CONFIRMED → PROCESSING → DISPATCHED → DELIVERED
        ↘ CANCELLED (only from PENDING or CONFIRMED)
```

### API Conventions
- All responses: `{ success, data, message, meta }`
- Errors: `{ success: false, error: { code, message, details } }`
- Pagination: `?page=1&limit=20` → `meta: { page, limit, total, totalPages }`

---

## API Documentation

See [API_REFERENCE.md](./API_REFERENCE.md) or run the backend and visit `http://localhost:4000/api-docs` (Swagger).

---

## Environment Variables

See `backend/.env.example` for all required variables.
