# Supabase Migration Plan

Step-by-step plan to migrate from the Docker PostgreSQL database to Supabase. The app keeps using the existing backend and custom JWT auth; only the database host changes.

---

## 1. Prerequisites and Supabase project

- [ ] **1.1** Create a Supabase project at [supabase.com](https://supabase.com) (or use an existing one).
- [ ] **1.2** In the Dashboard go to **Project Settings → Database**.
- [ ] **1.3** Copy the **Connection string** (URI format). Use the **Direct connection** (port **5432**) for a long-lived Node app; the connection pooler (port **6543**) is for serverless or many short-lived connections.
- [ ] **1.4** Ensure the URI uses SSL. Add `?sslmode=require` to the end if it is not already present.

---

## 2. Apply schema and extensions on Supabase

- [ ] **2.1** Choose one method:

  **Option A – SQL Editor in Dashboard**

  - [ ] Open **SQL Editor** in the Supabase Dashboard.
  - [ ] Paste the full contents of `database/init.sql` from this repo.
  - [ ] Run the script. Supabase supports `pgcrypto`; no schema changes are required.

  **Option B – psql**

  - [ ] From your machine, using the Supabase connection string:
    ```bash
    psql "<your-supabase-connection-uri>" -f database/init.sql
    ```

- [ ] **2.2** Verify: In the SQL Editor or via psql, list tables and confirm `restaurants`, `users`, `kpi_entries`, `kpi_targets`, `audit_logs`, `dashboards`, `widgets`, and `kpi_values` exist.

---

## 3. (Optional) Seed or migrate data

**Fresh start (no existing data to keep)**

- [ ] **3.1** Run the seed script on Supabase:
  - **SQL Editor**: Paste and run the contents of `database/seed.sql`.
  - **psql**: `psql "<your-supabase-connection-uri>" -f database/seed.sql`

**Migrate existing data from Docker Postgres**

- [ ] **3.2** From the host where Docker Postgres is running, dump the database (replace placeholders with your values):
  ```bash
  docker compose exec postgres pg_dump -U kpi_user -d kpi_dashboard --no-owner --no-acl -F p -f /tmp/dump.sql
  docker compose cp postgres:/tmp/dump.sql ./dump.sql
  ```
- [ ] **3.3** Restore into Supabase (run from the directory containing `dump.sql`):
  ```bash
  psql "<your-supabase-connection-uri>" -f dump.sql
  ```
- [ ] **3.4** If you only need data (schema already applied in step 2), use data-only dump and restore:
  ```bash
  docker compose exec postgres pg_dump -U kpi_user -d kpi_dashboard --no-owner --no-acl --data-only -F p -f /tmp/dump_data.sql
  docker compose cp postgres:/tmp/dump_data.sql ./dump_data.sql
  psql "<your-supabase-connection-uri>" -f dump_data.sql
  ```

---

## 4. Backend configuration for Supabase

- [ ] **4.1** Set the connection in `.env` using the Supabase URI:
  - Prefer a single variable: `DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require`
  - Or set `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` from the Supabase connection string.

- [ ] **4.2** Update env validation in `backend/src/config/env.ts` so the app accepts **either**:
  - `DATABASE_URL` (for Supabase), **or**
  - The full set of `POSTGRES_*` variables (for Docker).  
  When `DATABASE_URL` is set, use it; otherwise build the URL from `POSTGRES_*`.

- [ ] **4.3** Enable SSL for the `pg` pool when connecting to Supabase. In `backend/src/config/database.ts`, add SSL to the Pool config when the host is Supabase (e.g. host includes `supabase.co`) or when `DATABASE_URL` is set:
  - Example: `ssl: { rejectUnauthorized: false }` for development, or `rejectUnauthorized: true` with a proper CA for production.

---

## 5. Local and CI usage

- [ ] **5.1** **Local**: Point `.env` to Supabase (e.g. `DATABASE_URL=<supabase-uri>`) and run the backend (and frontend) without starting the `postgres` service.

- [ ] **5.2** **Docker Compose (no local Postgres)**:
  - Run with the Supabase override so Postgres is not started:
    - Use a compose override that omits the `postgres` service and removes the backend’s `depends_on: postgres`, or
    - Comment out the `postgres` service and the backend’s `depends_on: postgres` in `docker-compose.yml` when using Supabase.
  - Keep a way to run “with local Postgres” (e.g. uncommented `docker-compose.yml` or a separate override) for offline or Docker-based dev.

---

## 6. Production and deployment

- [ ] **6.1** In production (e.g. `docker-compose.prod.yml` or your deployment platform), set `DATABASE_URL` (or the Supabase `POSTGRES_*` equivalents) to the Supabase instance.
- [ ] **6.2** Remove or disable the `postgres` service so the app never starts a containerized database in production.

---

## 7. Rollback and verification

- [ ] **7.1** **Rollback**: Docker Postgres and `database/init.sql` / `database/seed.sql` are unchanged. To switch back, point env to `POSTGRES_HOST=postgres` (and other `POSTGRES_*` vars) and start the full stack including the `postgres` service.

- [ ] **7.2** **Verification**: After migration, run through: login, KPI list/create, audit log, and other critical flows. Confirm in the Supabase Dashboard (Table Editor or SQL) that data appears as expected.

---

## 8. Optional: connection pooler

Supabase provides a connection pooler (e.g. port **6543**). If you later move to serverless or many short-lived connections, switch the connection string to the pooler URI from **Project Settings → Database** and use that in `DATABASE_URL` or `POSTGRES_HOST`/`POSTGRES_PORT`.
