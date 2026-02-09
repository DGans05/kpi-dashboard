---
name: Supabase migration plan file
overview: Add a single markdown file at the repo root that documents a step-by-step plan to migrate from the Docker PostgreSQL database to Supabase, covering Supabase setup, schema deployment, backend config, and optional Docker/compose changes.
todos: []
isProject: false
---

# Supabase migration plan file

## Goal

Create a new file **[SUPABASE_MIGRATION_PLAN.md](SUPABASE_MIGRATION_PLAN.md)** at the project root that you can follow when moving from the current Docker Postgres setup to Supabase. The app will keep using your existing backend and custom JWT auth; only the database host changes.

## Current state (summary)

- **Database**: PostgreSQL 16 in Docker ([docker-compose.yml](docker-compose.yml)), with [database/init.sql](database/init.sql) (schema + `pgcrypto`) and [database/seed.sql](database/seed.sql).
- **Backend**: [backend/src/config/env.ts](backend/src/config/env.ts) builds `DATABASE_URL` from `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`. [backend/src/config/database.ts](backend/src/config/database.ts) uses a `pg` Pool with that URL and no SSL options.
- **Compose**: Backend depends on `postgres` service; postgres uses init/seed volume mounts.

## Content to put in SUPABASE_MIGRATION_PLAN.md

The file will be a step-by-step checklist with the following sections.

### 1. Prerequisites and Supabase project

- Create a Supabase project (or use existing).
- In Dashboard: **Project Settings → Database**.
- Copy the **Connection string** (URI format). Supabase uses port **5432** for direct and **6543** for the connection pooler; for a long-lived Node app, direct is fine.
- Note: Supabase requires **SSL**. The URI often includes `?sslmode=require` or you will add it.

### 2. Apply schema and extensions on Supabase

- **Option A – SQL Editor in Dashboard**: Run the contents of [database/init.sql](database/init.sql) in the Supabase SQL Editor (e.g. one script). Supabase supports `pgcrypto`; no changes needed for your current schema.
- **Option B – psql**: Use the connection string from the dashboard with `psql` and run `init.sql` (and optionally `seed.sql`) from the project’s `database/` folder.
- Verify: List tables in the Supabase SQL Editor or via psql to confirm `restaurants`, `users`, `kpi_entries`, `audit_logs`, etc. exist.

### 3. (Optional) Seed or migrate data

- **Fresh start**: Run [database/seed.sql](database/seed.sql) on the Supabase database if you want the same dev/seed data.
- **Existing data**: Use `pg_dump` from the Docker Postgres (schema + data or data-only) and restore into Supabase (e.g. `psql` or Supabase SQL Editor), with attention to roles and extensions. Document the exact dump/restore commands in the plan file.

### 4. Backend configuration for Supabase

- **Environment**: Prefer a single **DATABASE_URL** from Supabase (includes user, password, host, port, db, and optionally `?sslmode=require`). Your backend already uses a connection string in [backend/src/config/database.ts](backend/src/config/database.ts); [backend/src/config/env.ts](backend/src/config/env.ts) currently builds it from individual `POSTGRES_*` vars.
- **Changes** (to be done when executing the plan, not in the plan file itself):
  - Either set `DATABASE_URL` in `.env` and make env validation accept **either** `DATABASE_URL` or the set of `POSTGRES_*` (so Supabase = one URL, Docker = existing vars), **or**
  - Set `POSTGRES_HOST`, `POSTGRES_PORT`, etc. from the Supabase connection string and ensure SSL is used (see below).
- **SSL**: For Supabase, the `pg` pool must use SSL. In [backend/src/config/database.ts](backend/src/config/database.ts), when connecting to Supabase (e.g. when host contains `supabase.co` or when `DATABASE_URL` is set), add to the Pool config: `ssl: { rejectUnauthorized: false }` (or `true` with a proper CA). Document this in the plan so you don’t forget.

### 5. Local and CI usage

- **Local**: Point `.env` to Supabase (e.g. `DATABASE_URL=<supabase-uri>`) and run backend (and frontend) without starting the `postgres` service.
- **Docker Compose**: For “no local Postgres” mode, document how to start only frontend + backend (e.g. comment out or conditionally exclude the `postgres` service and its `depends_on` from [docker-compose.yml](docker-compose.yml)). Keep a second compose override or instructions for “with local Postgres” for offline/dev.

### 6. Production and deployment

- In production (e.g. [docker-compose.prod.yml](docker-compose.prod.yml) or your deployment env), set `DATABASE_URL` (or the Supabase `POSTGRES_*` equivalents) to the Supabase instance and remove or disable the `postgres` service so the app never starts a containerized DB in prod.

### 7. Rollback and verification

- **Rollback**: Keep Docker Postgres and init/seed scripts unchanged so you can switch back by pointing env back to `POSTGRES_HOST=postgres` and starting the full stack.
- **Verification**: After migration, run through: login, KPI list/create, audit log, and any critical paths; confirm in Supabase Dashboard that data appears as expected.

### 8. Optional: connection pooler

- Briefly note that Supabase offers a connection pooler (e.g. port 6543). If you later move to serverless or many short-lived connections, switch the connection string to the pooler and add a one-line note in the plan.

---

## File to create


| Item       | Detail                                                     |
| ---------- | ---------------------------------------------------------- |
| **Path**   | `SUPABASE_MIGRATION_PLAN.md` (repository root)             |
| **Format** | Markdown with clear headings and numbered steps            |
| **Scope**  | Documentation only; no code or config changes in this step |


After you approve this plan, the only change will be adding **SUPABASE_MIGRATION_PLAN.md** with the above structure and steps written out so you can follow them when you’re ready to perform the migration.