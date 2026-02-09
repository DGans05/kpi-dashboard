# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack restaurant KPI tracking dashboard. The primary stack is **Next.js 16 + Convex** (serverless backend-as-a-service). A legacy Express.js + PostgreSQL backend exists but is not used in production — Convex handles data, auth, and real-time queries.

## Commands

### Frontend (from `frontend/`)
```bash
npm run dev          # Start Next.js dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npx convex dev       # Start Convex dev environment (hot-reloads schema + functions)
npx convex deploy    # Deploy Convex functions to production
npx convex run seed:run  # Seed initial data (restaurants, targets)
```

### Backend — legacy (from `backend/`)
```bash
npm run dev          # Express dev server with ts-node-dev (port 4000)
npm run build        # Compile TypeScript
npm start            # Run compiled JS
```

### Docker (from root)
```bash
docker-compose up -d       # Start all services (frontend, backend, postgres, nginx)
docker-compose down -v     # Tear down and delete database volume
```

## Architecture

### Data flow (current production path)
```
Browser → Next.js App Router → Convex SDK (useQuery/useMutation) → Convex Cloud
```

### Frontend layers
- **Pages**: `frontend/app/` — Next.js App Router (dashboard, login, register, admin, kpi, labour, food, settings)
- **Components**: `frontend/components/` — `ui/` (shared primitives), `kpi/` (KPI forms/tables/charts), `admin/` (user/restaurant/audit management)
- **Convex functions**: `frontend/convex/` — server-side queries and mutations (schema.ts, users.ts, kpi.ts, restaurants.ts, audit.ts, auth.ts)
- **Hooks**: `frontend/lib/hooks/` — useAuth, useKPI, useRestaurants, useUsers, useAudit. These wrap Convex `useQuery`/`useMutation` calls.
- **State**: Zustand store (`frontend/lib/store/authStore.ts`) persisted to localStorage for auth state
- **Providers**: `frontend/lib/providers/` — ConvexProvider, QueryProvider (TanStack Query), ThemeProvider (next-themes)

### Legacy backend layers (not used in production)
```
Routes → Controllers (Zod validation) → Services (business logic) → Repositories (SQL) → PostgreSQL
```

### Authentication
- **Convex Auth** with Password provider (`frontend/convex/auth.ts`)
- Login: `signIn("password", { flow: "signIn", email, password })` via `@convex-dev/auth`
- `useCurrentUser()` hook queries `api.users.getCurrentUser` and syncs to Zustand
- `useAuthGuard(requiredRoles?)` protects routes by role, redirects to `/login` if unauthorized
- `middleware.ts` is minimal — auth is handled client-side by Convex

### Roles
- **admin**: Full access, user management, audit logs, all restaurants
- **manager**: CRUD scoped to assigned restaurant only
- **viewer**: Read-only for assigned restaurant

### Convex schema (5 custom tables)
- `users` — extends Convex auth users with role, restaurantId, fullName, isActive
- `restaurants` — name, city, timezone, isActive
- `kpi_entries` — daily metrics per restaurant (revenue, labour/food costs, orders, avgTicket)
- `kpi_targets` — threshold alerts per restaurant per metric
- `audit_logs` — action tracking with userId, resourceType, changes

### Key libraries
- **UI**: Tailwind CSS, Radix UI primitives, Lucide icons, class-variance-authority
- **Forms**: React Hook Form + Zod (v4) validation
- **Charts**: Recharts
- **Dates**: date-fns
- **State**: Zustand (auth), TanStack Query (legacy caching)
- **Theming**: next-themes (dark/light mode with CSS variables)

## Environment Setup

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_CONVEX_URL=<your convex deployment URL>
```

### Convex Dashboard (Settings → Environment Variables)
```
JWT_PRIVATE_KEY    # RSA PEM key for Convex Auth
JWKS               # JSON Web Key Set
CONVEX_SITE_URL    # e.g. https://xxx.convex.site
```

Generate auth keys: `cd frontend && node scripts/generate-auth-keys.mjs`

### Default test credentials
- admin@kpi.com / password123
- manager1@kpi.com / password123 (Downtown Delivery Hub, NY)
- manager2@kpi.com / password123 (Westside Kitchen, LA)

## Conventions

- Path alias: `@/*` maps to `frontend/*` root
- Convex functions use `getAuthUserId(ctx)` + lookup for authorization; admins have `restaurantId: null` (access all), managers/viewers are scoped to their `restaurantId`
- UI components use CSS variables for theming (no hardcoded colors)
- Validation: Zod schemas in both frontend forms and Convex function inputs
- IDs in Convex are typed (`v.id("restaurants")`) — never use plain strings for references
