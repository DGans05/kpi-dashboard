# KPI Dashboard

A comprehensive KPI (Key Performance Indicator) dashboard for restaurant management, featuring real-time performance tracking, trend analysis, and data visualization.

## Features

- **Dashboard Overview**: Visual KPI cards with trends and status indicators
- **Data Visualization**: Interactive charts using Recharts (line, bar, area)
- **KPI Entry Management**: Full CRUD operations for daily KPI entries
- **Labour & Food KPI Tracking**: Dedicated pages for cost analysis
- **User Management**: Admin panel for managing users and permissions
- **Audit Logging**: Complete audit trail of all changes
- **Export Functionality**: CSV export for reports
- **Role-Based Access Control**: Admin, Manager, and Viewer roles

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- TanStack Query (React Query)
- Zustand (State Management)
- Tailwind CSS
- Recharts
- React Hook Form + Zod

### Backend
- Node.js 20
- Express.js
- TypeScript
- PostgreSQL 16
- JWT Authentication (HttpOnly cookies)

### Infrastructure
- Docker & Docker Compose
- Nginx (Production)

## Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop) (v20+)
- [Docker Compose](https://docs.docker.com/compose/) (v2+)
- [Node.js](https://nodejs.org/) (v20+ for local development)
- [Git](https://git-scm.com/)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd kpi-dashboard
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

The default `.env` file is pre-configured for local development.

### 3. Start with Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/health

### 5. Default Admin Account

```
Email: admin@kpi.com
Password: password123
```

> ⚠️ **Important**: Change the default admin password immediately in production!

## Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```

### Database

The PostgreSQL database is automatically initialized with:
- Schema (`database/init.sql`)
- Seed data (`database/seed.sql`)

To reset the database:

```bash
docker-compose down -v
docker-compose up -d
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_USER` | Database username | `kpiuser` |
| `POSTGRES_PASSWORD` | Database password | `secure_password` |
| `POSTGRES_DB` | Database name | `kpi_dashboard` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | Random string |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `BACKEND_PORT` | Backend server port | `4000` |
| `LOG_LEVEL` | Logging verbosity | `debug` |
| `JWT_EXPIRY` | JWT token expiry | `7d` |

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### KPI Entries
- `GET /api/kpi/entries` - List entries
- `POST /api/kpi/entries` - Create entry
- `PATCH /api/kpi/entries/:id` - Update entry
- `DELETE /api/kpi/entries/:id` - Delete entry

### Dashboard
- `GET /api/kpi/dashboard` - Dashboard summary
- `GET /api/kpi/aggregated` - Aggregated data

### Admin (Admin only)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/restaurants` - List restaurants
- `GET /api/audit` - Audit logs

### Reports
- `GET /api/reports/kpi/export` - Export KPI data

## User Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Full access, user management, audit logs |
| **Manager** | CRUD KPI entries for assigned restaurant |
| **Viewer** | Read-only access to assigned restaurant |

## Production Deployment

1. Copy and configure production environment:
   ```bash
   cp .env.production.example .env.production
   ```

2. Update all secrets and URLs in `.env.production`

3. Deploy with production compose:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed production deployment instructions.

## Project Structure

```
kpi-dashboard/
├── frontend/               # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   └── lib/               # Utilities, hooks, API clients
├── backend/               # Express.js backend
│   └── src/
│       ├── controllers/   # HTTP handlers
│       ├── services/      # Business logic
│       ├── repositories/  # Database operations
│       ├── middleware/    # Express middleware
│       └── routes/        # Route definitions
├── database/              # SQL schema and seeds
└── docker-compose.yml     # Docker orchestration
```

## Troubleshooting

### Backend not connecting to database

Wait for PostgreSQL to be healthy:
```bash
docker-compose logs postgres
```

### CORS errors

Ensure `FRONTEND_URL` in backend matches your frontend URL.

### Cookie not being set

Check that cookies are configured with correct `sameSite` and `secure` flags for your environment.

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request
