# Environment Configuration Setup

## Overview

A robust, type-safe environment variable validation system has been implemented using **Zod** runtime validation with comprehensive error messages.

## Files Created/Modified

### `backend/src/config/env.ts`
Complete environment variable validation and configuration system.

**Key Features:**
- ✅ Zod-based runtime validation
- ✅ Type-safe configuration object
- ✅ Minimum 32-character JWT secret enforcement
- ✅ Descriptive error messages with formatting
- ✅ Derived values (e.g., database URL construction)
- ✅ Environment predicate helpers (isDevelopment, isProduction, etc.)

### `backend/src/config/logger.ts`
Updated to use the new centralized config system.

### `backend/src/config/database.ts`
Updated to import config from the env module.

### `backend/src/server.ts`
Updated to validate environment on startup before running any other code.

### `backend/src/config/env.example.ts`
Comprehensive usage documentation and examples.

## Configuration Object Structure

```typescript
interface Config {
  // Environment
  nodeEnv: 'development' | 'test' | 'production'
  isDevelopment: boolean
  isTest: boolean
  isProduction: boolean
  
  // Server
  port: number
  
  // Database
  database: {
    user: string
    password: string
    database: string
    host: string
    port: number
    url: string // Pre-constructed PostgreSQL URL
  }
  
  // JWT
  jwt: {
    secret: string  // Minimum 32 characters
    expiry: string  // e.g., "1d", "24h", "3600s"
  }
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}
```

## Required Environment Variables

| Variable | Type | Default | Requirements |
|----------|------|---------|--------------|
| `NODE_ENV` | string | `development` | Must be: `development`, `test`, or `production` |
| `PORT` | number | `4000` | Positive integer |
| `POSTGRES_USER` | string | ✓ Required | Non-empty string |
| `POSTGRES_PASSWORD` | string | ✓ Required | Non-empty string |
| `POSTGRES_DB` | string | ✓ Required | Non-empty string |
| `POSTGRES_HOST` | string | ✓ Required | Non-empty string |
| `POSTGRES_PORT` | number | `5432` | Positive integer |
| `JWT_SECRET` | string | ✓ Required | Minimum 32 characters for security |
| `JWT_EXPIRY` | string | `1d` | Valid duration string |
| `LOG_LEVEL` | string | `info` | Must be: `debug`, `info`, `warn`, or `error` |

## Example .env File

```env
# Application environment
NODE_ENV=development

# Server
PORT=4000

# PostgreSQL
POSTGRES_USER=kpi_user
POSTGRES_PASSWORD=kpi_password
POSTGRES_DB=kpi_dashboard
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# JWT (must be at least 32 characters)
JWT_SECRET=your_super_secret_jwt_key_that_is_long_enough
JWT_EXPIRY=1d

# Logging
LOG_LEVEL=info
```

## Usage Examples

### Basic Usage
```typescript
import { config } from './config/env';

console.log(config.port);              // 4000
console.log(config.isDevelopment);     // true
console.log(config.jwt.secret);        // String (32+ chars)
```

### In Express Application
```typescript
import { config } from './config/env';
import express from 'express';

const app = express();

if (config.isDevelopment) {
  app.use(errorHandler);
}

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
```

### JWT Token Generation
```typescript
import jwt from 'jsonwebtoken';
import { config } from './config/env';

const token = jwt.sign(
  { userId: 123 },
  config.jwt.secret,
  { expiresIn: config.jwt.expiry }
);
```

### Database Connection
```typescript
import { config } from './config/env';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: config.database.url,
  max: 20,
});
```

## Validation Flow

1. **Startup**: When `env.ts` is first imported, it validates all environment variables
2. **Failure**: If validation fails, displays formatted error message and exits with code 1
3. **Success**: If validation passes, exports typed `config` object
4. **Usage**: Application code imports `config` with full TypeScript type safety

## Error Handling

When environment variables are missing or invalid, you'll see:

```
╔════════════════════════════════════════════════════════════════╗
║                 ENVIRONMENT VALIDATION FAILED                  ║
╚════════════════════════════════════════════════════════════════╝

The following environment variables are invalid or missing:

  • JWT_SECRET: JWT_SECRET must be at least 32 characters long for security
  • POSTGRES_HOST: POSTGRES_HOST is required

Please ensure all required variables are set correctly.
```

## Type Safety

All configuration values are fully typed in TypeScript:

```typescript
// ✅ TypeScript knows the type
const port: number = config.port;
const env: 'development' | 'test' | 'production' = config.nodeEnv;

// ✅ TypeScript provides autocomplete
config.database.   // autocomplete: host, port, user, password, url, database
config.jwt.        // autocomplete: secret, expiry
config.is          // autocomplete: isDevelopment, isProduction, isTest
```

## Benefits

1. **Early Failure**: Configuration is validated before any code runs
2. **Clear Errors**: Formatted error messages show exactly what's wrong
3. **Type Safety**: Full TypeScript support with proper types
4. **Centralized**: All configuration in one place
5. **Security**: Enforces minimum JWT secret length
6. **Maintainability**: Easy to add new environment variables
7. **Documentation**: Built-in descriptions for each variable

## Testing Configuration

The configuration system has been tested and verified to work correctly:

- ✅ Backend starts successfully with valid configuration
- ✅ Database connection initialized with correct DATABASE_URL
- ✅ Health endpoint responds correctly
- ✅ All required environment variables validated
- ✅ Type safety enforced by TypeScript
