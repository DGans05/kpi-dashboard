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
| Auth | WorkOS AuthKit (Next.js) + Convex custom JWT (WorkOS JWKS) |
| Infrastructure | Docker Compose, Nginx; Convex cloud for frontend data |

## Architecture Pattern

```
Frontend: Hooks → API Client → Backend
Backend:  Routes → Controllers → Services → Repositories → PostgreSQL
```

## Key Directories

```
frontend/
├── app/
│   ├── api/auth/[...workos]/  # WorkOS handleAuth (callback)
│   ├── callback/              # Post-login redirect page
│   └── ...                    # Next.js pages (App Router)
├── components/             # React components
├── convex/                 # Convex backend (schema, auth.config.ts, functions)
└── lib/
    ├── api/               # API client (client.ts is base)
    ├── auth-actions.ts    # WorkOS signIn/signUp server actions
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
| Auth middleware | `backend/src/middleware/auth.ts` (Express); `frontend/middleware.ts` (authkitMiddleware) |
| WorkOS auth route | `frontend/app/api/auth/[...workos]/route.ts` |
| WorkOS server actions | `frontend/lib/auth-actions.ts` (signInAction, signUpAction) |
| Convex WorkOS JWT | `frontend/convex/auth.config.ts` |
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

## Auth Flow (WorkOS + Convex)

1. **Login/Register**: User clicks "Sign in" or "Create account" → server action calls `getSignInUrl()` / `getSignUpUrl()` → redirect to WorkOS.
2. **Callback**: WorkOS redirects to `NEXT_PUBLIC_WORKOS_REDIRECT_URI` (e.g. `http://localhost:3000/api/auth/callback`) with `?code=...`.
3. **Handle auth**: `app/api/auth/[...workos]/route.ts` exports `GET = handleAuth({ returnPathname: '/dashboard' })`; it exchanges code, saves session (cookie), redirects to `/dashboard`.
4. **Protected routes**: `middleware.ts` uses `authkitMiddleware()`; matcher excludes `/login`, `/register`, `/callback`, `api/auth`, `_next/*`, `favicon.ico`.
5. **Convex**: `convex/auth.config.ts` configures WorkOS as custom JWT provider (JWKS) so Convex can verify WorkOS tokens when frontend calls Convex with auth.
6. **User in app**: Use `getUser()` from `@workos-inc/authkit-nextjs` in server components; sign out via `signOut({ returnTo })`.

## Environment Variables

**Frontend (Next.js + WorkOS):** `NEXT_PUBLIC_CONVEX_URL`, `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD` (32+ chars), `NEXT_PUBLIC_WORKOS_REDIRECT_URI` (e.g. `http://localhost:3000/api/auth/callback`). Redirect URI must match WorkOS dashboard and point at the route that runs `handleAuth()`.

**Convex:** When running `npx convex dev` from frontend, set `WORKOS_CLIENT_ID` (same as frontend) so `convex/auth.config.ts` can verify WorkOS JWTs.

**Backend (Express/PostgreSQL):** `POSTGRES_*`, `JWT_SECRET`, `FRONTEND_URL`. See `.env.example` for full list.

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

### Project Cleanup (2026-01-30)
- Fixed database schema: added `timezone`, `is_active` to restaurants; `full_name`, `is_active` to users
- Fixed environment variable: `NEXT_PUBLIC_API_BASE_URL` → `NEXT_PUBLIC_API_URL`, added `FRONTEND_URL`
- Fixed hardcoded colors in `KPIChart.tsx` and `badge.tsx` to use CSS variables
- Removed unused import in `auth.service.ts`
- Removed 4 redundant documentation files (summaries that duplicated main docs)

### Testing & Bug Fixes (2026-01-31)
- Fixed root redirect: localhost now goes directly to /login (307 redirect)
- Created `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:4000`
- Fixed missing database table: added `audit_logs` table to init.sql and created in database
- Fixed Docker healthchecks: added curl to both Dockerfiles, rebuilt containers - ALL SERVICES NOW HEALTHY
- Fixed Next.js build-time env vars: Updated Dockerfile and docker-compose.yml to pass NEXT_PUBLIC_API_URL as build arg
- Comprehensive testing documented in `TEST_RESULTS.md`
- All API endpoints verified working (auth, KPI, users, restaurants, audit, health)
- Test credentials: admin@kpi.com / password123
- **Status: ✅ All systems operational, no issues remaining**

### WorkOS + Convex Auth (2026-02-02)
- Switched frontend auth from Express JWT + Convex Password to **WorkOS AuthKit** (Next.js).
- **New/updated:** `@workos-inc/authkit-nextjs`; `app/api/auth/[...workos]/route.ts` (handleAuth, returnPathname `/dashboard`); `app/callback/page.tsx`; `lib/auth-actions.ts` (signInAction, signUpAction using getSignInUrl/getSignUpUrl); `middleware.ts` (authkitMiddleware, matcher excludes login/register/callback/api/auth); `convex/auth.config.ts` (WorkOS custom JWT providers for Convex).
- **Env:** `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD`, `NEXT_PUBLIC_WORKOS_REDIRECT_URI` (use `/api/auth/callback` so handleAuth receives the code). Convex needs `WORKOS_CLIENT_ID` when running `npx convex dev`.
- **Login/Register pages:** Single "Sign in with WorkOS" / "Create account with WorkOS" buttons; forms submit to server actions that redirect to WorkOS.
- **Flow:** Click sign in/up → redirect to WorkOS → redirect to `/api/auth/callback?code=...` → handleAuth exchanges code, sets cookie, redirects to `/dashboard`. Middleware protects non-public routes.

## README Quick Reference

### Features
- Dashboard overview with KPI cards and trend indicators
- Data visualization with Recharts (line, bar, area charts)
- KPI entry management (CRUD operations)
- Labour & Food cost tracking pages
- User management (admin panel)
- Audit logging
- CSV export for reports
- Role-based access control (admin, manager, viewer)

### Access Points
- **Frontend**: http://localhost:3000 (redirects to /login)
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/health
- **Nginx Proxy**: http://localhost:80

### Default Accounts
- **Admin**: admin@kpi.com / password123
- **Manager 1**: manager1@kpi.com / password123 (Downtown Delivery Hub, NY)
- **Manager 2**: manager2@kpi.com / password123 (Westside Kitchen, LA)

### Docker Commands
```bash
docker-compose up -d          # Start all services
docker-compose logs -f        # View logs
docker-compose down -v        # Reset (deletes database)
docker-compose ps             # Check service status
```

### Prerequisites
- Docker v20+ & Docker Compose v2+
- Node.js v20+ (for local dev)
- Git

### Project Structure Highlights
- **frontend/app/**: Next.js App Router pages (dashboard/, login/, etc.)
- **frontend/components/**: UI components (ui/, kpi/, admin/)
- **frontend/lib/**: API clients, hooks, stores, providers
- **backend/src/**: Express app (controllers, services, repositories, middleware, routes)
- **database/**: init.sql (schema), seed.sql (test data)
- **nginx/**: nginx.conf for reverse proxy

### Key Documentation Files
- `README.md` - Main project documentation
- `TEST_RESULTS.md` - Comprehensive test results and credentials
- `DEPLOYMENT.md` - Production deployment guide
- `AUTH_SERVICE.md` - Authentication service documentation
- `ENV_CONFIGURATION.md` - Environment setup guide

---
*Last updated: 2026-02-02*
