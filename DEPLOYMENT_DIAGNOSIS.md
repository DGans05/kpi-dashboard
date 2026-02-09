# Deployment & database diagnosis

Findings from Vercel MCP and codebase review (no Convex MCP available in this session).

## Vercel (frontend)

- **Status**: All recent deployments are **READY**; build completes successfully.
- **Build**: Next.js 16.1.6 (Turbopack), `npm run build` runs from the correct app (kpi-dashboard-frontend).
- **Live app**: https://kpi-dashboard-gilt.vercel.app returns 200 and shows the **login page** (email/password form).
- **Project**: `kpi-dashboard`, team `dgans-projects`. Production URL: `kpi-dashboard-gilt.vercel.app`.

### What to verify in Vercel

1. **Root Directory**  
   In **Project → Settings → General**: Root Directory must be **`frontend`** so Vercel builds the Next.js app, not the repo root.

2. **Environment variables**  
   In **Project → Settings → Environment Variables** (Production, Preview, Development as needed):
   - **`NEXT_PUBLIC_CONVEX_URL`** = your Convex deployment URL (e.g. `https://xxxx.convex.cloud`).  
   If this is missing, the Convex client gets `undefined` and:
   - Convex queries (e.g. `getCurrentUser`) will not run.
   - Login/register may appear to submit but not complete, or the dashboard may hang on “Loading…”.

3. **Redeploy**  
   After adding or changing env vars, trigger a new deployment (Redeploy from the Vercel dashboard) so the new values are baked into the build.

---

## Convex (backend / database)

The app uses **Convex only** for data and auth (no Express/Postgres in the live path). The frontend talks to Convex via `NEXT_PUBLIC_CONVEX_URL`.

### What to verify in Convex Dashboard

1. **Deployment URL**  
   In **Convex Dashboard → your project → Settings → URL**: copy the deployment URL and set it as `NEXT_PUBLIC_CONVEX_URL` in Vercel (see above).

2. **Environment variables (Convex)**  
   In **Convex Dashboard → your project → Settings → Environment Variables** set:
   - **`JWT_PRIVATE_KEY`** – RSA private key (PEM) for Convex Auth.  
     Generate with: `cd frontend && node scripts/generate-auth-keys.mjs`
   - **`JWKS`** – JSON Web Key Set from the same script.
   - **`CONVEX_SITE_URL`** – Your Convex site URL (e.g. `https://xxxx.convex.site`; often same host as deployment URL).

   Without these, Convex Auth (email/password) will fail (e.g. “Missing environment variable JWT_PRIVATE_KEY” or 401s).

3. **Schema / tables**  
   The app expects:
   - **Auth tables**: `users`, `authSessions`, `authAccounts`, `authRefreshTokens`, `authVerificationCodes`, `authVerifiers`, `authRateLimits` (from `authTables` + custom `users` with `role`, `restaurantId`, `fullName`, `isActive`).
   - **App tables**: `restaurants`, `kpi_entries`, `kpi_targets`, `audit_logs`.

   If you changed the schema (e.g. from an older Convex Auth setup), run **Convex Dashboard → Data** and confirm these tables exist and match `frontend/convex/schema.ts`. Push schema with `npx convex dev` or `npx convex deploy` from the `frontend` directory.

4. **First admin user**  
   After first sign-up there are no users with `role: "admin"`. In **Convex Dashboard → Data → users**, open the new user and set **`role`** to **`admin`** so the admin panel and routes work.

---

## Code (quick checks)

- **Convex client**: `frontend/lib/providers/ConvexProvider.tsx` uses `process.env.NEXT_PUBLIC_CONVEX_URL!`. If the env is missing at build time (e.g. on Vercel), the inlined value is `undefined` and the app will break when any Convex code runs. So `NEXT_PUBLIC_CONVEX_URL` must be set in Vercel before building.
- **Auth**: Login/register use Convex Auth (Password) only; no WorkOS. Middleware is a no-op; dashboard layout redirects unauthenticated users to `/login` via `useCurrentUser()`.

---

## If you have Convex MCP

Use it to:

- Confirm the Convex project/deployment linked to this repo.
- List deployment env vars (without secrets) to verify `JWT_PRIVATE_KEY`, `JWKS`, `CONVEX_SITE_URL` are set.
- Inspect or run functions (e.g. `users.getCurrentUser`) to see errors.
- Check Data (tables) and schema push status.

---

## Summary

| Layer        | Status / likely issue |
|-------------|------------------------|
| Vercel build| OK (builds and deploys). |
| Vercel runtime | Confirm **Root Directory** = `frontend` and **`NEXT_PUBLIC_CONVEX_URL`** is set; redeploy after changing env. |
| Convex      | Set **JWT_PRIVATE_KEY**, **JWKS**, **CONVEX_SITE_URL** in Convex env; ensure schema/tables match `frontend/convex/schema.ts`; set first user’s **role** to `admin` in Data. |

If login or dashboard still fails after the above, the next step is to check browser Network tab for failing requests to Convex and any Convex Dashboard logs (or Convex MCP) for auth/function errors.
