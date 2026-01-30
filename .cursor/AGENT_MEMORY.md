# KPI Dashboard - Agent Memory

> Quick reference for AI agents working on this codebase. Priority information only.

## Project Type

Full-stack restaurant KPI tracking dashboard (TypeScript)

## System Diagram

```
┌─────────────┐
│   Manager   │
│   Browser   │
└──────┬──────┘
       │ HTTPS
       ↓
┌─────────────┐
│    nginx    │ ← Reverse Proxy
└──────┬──────┘
       │
       ├→ Next.js Frontend (Port 3000)
       │   • Login/Dashboard
       │   • KPI Management UI
       │   • Charts & Analytics
       │   • Admin Panel
       │
       └→ Express Backend (Port 4000)
           • JWT Auth
           • KPI CRUD API
           • Aggregation Engine
           • Audit Logging
           ↓
       PostgreSQL (Port 5432)
           • 6 core tables
           • UUID primary keys
           • Foreign key constraints
           • Indexes for performance
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React 18, TanStack Query, Zustand, Tailwind CSS |
| Backend | Express.js, Node.js 20, TypeScript |
| Database | PostgreSQL 16 |
| Auth | JWT in HttpOnly cookies |
| Infrastructure | Docker Compose, Nginx |

## Architecture Pattern

```
Frontend: Hooks → API Client → Backend
Backend:  Routes → Controllers → Services → Repositories → PostgreSQL
```

## Key Directories

```
frontend/
├── app/                    # Next.js pages (App Router)
├── components/             # React components
└── lib/
    ├── api/               # API client (client.ts is base)
    ├── hooks/             # TanStack Query hooks
    └── store/             # Zustand stores

backend/src/
├── controllers/           # HTTP handlers + Zod validation
├── services/              # Business logic + authorization
├── repositories/          # SQL queries
├── middleware/            # auth.ts, authorize.ts, error-handler.ts
└── routes/                # Express route definitions

database/
├── init.sql               # Schema
└── seed.sql               # Test data
```

## Core Files

| Purpose | Path |
|---------|------|
| Backend entry | `backend/src/server.ts` |
| DB connection | `backend/src/config/database.ts` |
| Auth middleware | `backend/src/middleware/auth.ts` |
| API base client | `frontend/lib/api/client.ts` |
| Auth store | `frontend/lib/store/authStore.ts` |
| Query provider | `frontend/lib/providers/QueryProvider.tsx` |

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Accounts with roles (admin/manager/viewer) |
| `restaurants` | Restaurant locations |
| `kpi_entries` | Daily KPI data (revenue, costs, orders) |
| `kpi_targets` | Alert thresholds per restaurant |

## User Roles

- **admin**: Full access, user management, audit logs
- **manager**: CRUD for assigned restaurant only
- **viewer**: Read-only for assigned restaurant

## API Endpoints

```
Auth:    POST /api/auth/login, /logout, GET /me
KPI:     /api/kpi/entries (CRUD), /dashboard, /aggregated
Users:   /api/users (admin only)
Reports: /api/reports/kpi/export
```

## Auth Flow

1. Login → JWT set as HttpOnly cookie
2. Requests include cookie automatically (`credentials: 'include'`)
3. `auth.ts` middleware verifies JWT, populates `req.user`
4. `authorize.ts` enforces role-based access

## Environment Variables

Required: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `JWT_SECRET`, `FRONTEND_URL`

See `.env.example` for full list.

## Running the App

```bash
docker-compose up -d          # Start all services
# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
# Default login: admin@kpi.com / password123
```

## Past Tasks / Context

- Project is fully functional with auth, KPI CRUD, dashboards, charts
- Uses Zod for request validation in controllers
- TanStack Query handles caching/invalidation on frontend
- Extensive documentation exists in root (AUTH_*.md, CRYPTO_*.md, etc.)

### UI Redesign (2026-01-28)
- Added dark/light mode with system preference default (`next-themes`)
- Theme toggle available in sidebar footer and login page
- All components now use CSS variables (not hardcoded colors)
- New UI components: Card, Badge, Avatar, Input, Tabs, ThemeToggle
- Modern card-based layout inspired by SugarCRM/DisputeFox references
- Sidebar with icons, collapsible on mobile
- Files changed: globals.css, tailwind.config.ts, layout.tsx, all dashboard pages, all KPI components

---
*Last updated: 2026-01-28*
