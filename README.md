# KPI Dashboard

A comprehensive KPI (Key Performance Indicator) dashboard for restaurant management, featuring real-time performance tracking, trend analysis, and data visualization.

## Features

- **Dashboard Overview**: Visual KPI cards with trends and status indicators
- **Data Visualization**: Interactive charts using Recharts (line, bar, area)
- **KPI Entry Management**: Full CRUD operations for daily KPI entries
- **Labour & Food KPI Tracking**: Dedicated pages for cost analysis
- **User Management**: Admin panel for managing users and permissions
- **Audit Logging**: Complete audit trail of all changes
- **Role-Based Access Control**: Admin, Manager, and Viewer roles

## Tech Stack

### Frontend (Vercel)
- Next.js 16 (App Router)
- React 18
- TypeScript
- Convex (real-time data + auth)
- Tailwind CSS
- Recharts
- React Hook Form + Zod

### Backend (Convex)
- [Convex](https://convex.dev) – backend-as-a-service (database, auth, serverless functions)
- [Convex Auth](https://labs.convex.dev/auth) – email/password only (Password provider)
- Schema: restaurants, users (role/restaurantId), kpi_entries, kpi_targets, audit_logs

The `backend/` folder is legacy Express + PostgreSQL and is not used; all data and auth go through Convex.

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [Convex](https://convex.dev) account (free tier available)
- [Vercel](https://vercel.com) account (for frontend deployment)

## Quick Start

### 1. Clone and install

```bash
git clone <repository-url>
cd kpi-dashboard/frontend
npm install
```

### 2. Convex setup

Link the app to a Convex project (creates `.env.local` with `NEXT_PUBLIC_CONVEX_URL`):

```bash
npx convex dev
```

When prompted, sign in to Convex and create or link a project. Leave `npx convex dev` running in one terminal so the Convex backend stays in sync.

### 3. Convex Auth (JWT keys) — required for login/register

Convex Auth needs `JWT_PRIVATE_KEY` and `JWKS` in the **Convex deployment** (not in `.env.local`). Without them you’ll see: `Missing environment variable JWT_PRIVATE_KEY`.

1. From the project root, run:
   ```bash
   cd frontend && node scripts/generate-auth-keys.mjs
   ```
2. Open [Convex Dashboard](https://dashboard.convex.dev) → your project → **Settings** → **Environment Variables**.
3. Add these variables (copy the exact values from the script output):
   - **`JWT_PRIVATE_KEY`** — the full PEM string (single line, in quotes).
   - **`JWKS`** — the JSON string (single line).
   - **`CONVEX_SITE_URL`** — your Convex site URL, e.g. `https://your-deployment.convex.site` (find it in Convex Dashboard → Settings → URL, or use the same host as your deployment).
4. Save. Convex will redeploy; then try **Login** or **Register** again.

### 4. Seed data (optional)

Create initial restaurants and KPI targets:

```bash
npx convex run seed:run
```

### 5. Run the frontend

In another terminal:

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. First user (admin)

1. Go to **Register** and create an account (email + password).
2. In the [Convex Dashboard](https://dashboard.convex.dev) → **Data** → **users**, open your user document.
3. Set `role` to `"admin"` and save.
4. Refresh the app; you’ll have admin access (users, restaurants, audit).

## Environment Variables

### Frontend (Vercel / local)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL (set by `npx convex dev` or in Vercel) |

Copy `frontend/.env.local.example` to `frontend/.env.local` and fill in the Convex URL if not using `npx convex dev` to generate it.

### Convex (backend) — required for auth

Set these in [Convex Dashboard](https://dashboard.convex.dev) → your project → **Settings** → **Environment Variables**:

| Variable | Description |
|----------|-------------|
| `JWT_PRIVATE_KEY` | RSA private key (PEM) for signing JWTs. Generate with `node frontend/scripts/generate-auth-keys.mjs`. |
| `JWKS` | JSON Web Key Set (public key). Output of the same script. |
| `CONVEX_SITE_URL` | Your Convex site URL (e.g. `https://your-deployment.convex.site`). |

## Deployment

### Vercel (frontend)

1. Push your code to GitHub and import the repo in [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Add environment variable: `NEXT_PUBLIC_CONVEX_URL` = your Convex deployment URL (from Convex dashboard → Settings → URL).
4. Deploy. The app will use Convex for all data and auth.

### Convex (backend)

- **Development**: `npx convex dev` pushes to your dev deployment.
- **Production**: `npx convex deploy` (or enable Convex’s GitHub integration) deploys functions to production.
- Use the same Convex project for dev and prod, or separate projects and set `NEXT_PUBLIC_CONVEX_URL` per environment.

## Project Structure

```
kpi-dashboard/
├── frontend/                 # Next.js app (Vercel)
│   ├── app/                  # App Router pages
│   ├── components/
│   ├── convex/               # Convex backend
│   │   ├── schema.ts         # Data model
│   │   ├── auth.ts           # Convex Auth (Password)
│   │   ├── users.ts          # getCurrentUser
│   │   ├── restaurants.ts    # CRUD restaurants
│   │   ├── kpi.ts            # KPI entries, dashboard, aggregated
│   │   ├── usersAdmin.ts     # Admin: list/update users
│   │   ├── audit.ts          # Audit logs
│   │   └── seed.ts           # Seed restaurants + targets
│   └── lib/                  # Hooks, store, UI utils
├── backend/                  # Legacy Express API (optional)
└── database/                 # Legacy SQL schema (reference)
```

## User Roles

| Role | Capabilities |
|------|--------------|
| **Admin** | Full access, user management, audit logs, all restaurants |
| **Manager** | CRUD KPI entries for assigned restaurant only |
| **Viewer** | Read-only access to assigned restaurant |

## Troubleshooting

- **"No CONVEX_DEPLOYMENT set"**  
  Run `npx convex dev` from the `frontend` directory and complete the Convex login/link flow.

- **Missing `_generated`**  
  Convex generates `frontend/convex/_generated/` when you run `npx convex dev`. The app will not build until this exists.

- **Auth / 401**  
  Ensure Convex Auth is configured (`frontend/convex/auth.ts`) and the middleware is active (`frontend/middleware.ts`). For local dev, use the same origin or ensure cookies are allowed for your Convex URL.

## License

MIT
