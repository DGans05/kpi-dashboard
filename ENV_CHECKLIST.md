# Environment Configuration Checklist

## For Developers

### ✅ Accessing Configuration

1. Import the config object:
```typescript
import { config } from './config/env';
```

2. Use typed values with full autocomplete:
```typescript
config.port              // number
config.nodeEnv           // 'development' | 'test' | 'production'
config.isDevelopment     // boolean
config.database.url      // string
config.jwt.secret        // string
config.logLevel          // 'debug' | 'info' | 'warn' | 'error'
```

### ✅ Setting Up Environment Variables

1. Copy environment variables from `.env` file (or create if missing)
2. Ensure `JWT_SECRET` is at least 32 characters (for security)
3. Update `POSTGRES_*` variables to match your database setup
4. Set `NODE_ENV` based on environment (development/test/production)

### ✅ Testing Configuration

```bash
# Build the backend (validates TypeScript)
npm run build

# Start the backend (validates environment variables)
npm start
```

If environment variables are invalid:
- Application exits immediately
- Clear error message shows which variables are problematic
- Fix the `.env` file and restart

### ✅ Adding New Environment Variables

To add a new required variable:

1. Update `backend/src/config/env.ts`:
```typescript
const envSchema = z.object({
  // ... existing variables ...
  MY_NEW_VAR: z
    .string()
    .min(1, "MY_NEW_VAR is required")
    .describe("Description of my new variable"),
});
```

2. Update the config object:
```typescript
export const config = {
  // ... existing config ...
  myNewVar: rawEnv.MY_NEW_VAR,
} as const;
```

3. Update `.env` file with new variable
4. Update `ENV_CONFIGURATION.md` with documentation
5. Rebuild and restart

### ✅ Validation Rules Reference

| Rule | Example |
|------|---------|
| Enum validation | `z.enum(['development', 'test', 'production'])` |
| String with minimum length | `z.string().min(32, "error message")` |
| Integer validation | `z.coerce.number().int().positive()` |
| Optional with default | `z.string().default("default value")` |
| Union with coercion | `z.union([z.string(), z.number()]).pipe(z.coerce.number())` |

### ✅ Environment Predicate Helpers

These boolean helpers are automatically available:

```typescript
if (config.isDevelopment) {
  // Only runs in development environment
}

if (config.isProduction) {
  // Only runs in production environment
}

if (config.isTest) {
  // Only runs in test environment
}
```

### ✅ Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "JWT_SECRET must be at least 32 characters" | Secret too short | Use a longer, random string |
| "POSTGRES_HOST is required" | Variable not set | Add to `.env` file |
| "Environment validation failed" | Invalid environment variable | Check `.env` file and restart |
| Type errors in IDE | stale cache | Rebuild with `npm run build` |

### ✅ Best Practices

1. **Never commit `.env`** - Always use `.env.example` template
2. **Use strong JWT_SECRET** - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
3. **Match NODE_ENV values** - Use only: development, test, production
4. **Document new variables** - Add to ENV_CONFIGURATION.md
5. **Validate early** - Configuration is validated on startup
6. **Use config predicate helpers** - Instead of comparing strings multiple times

### ✅ Generating a Secure JWT Secret

```bash
# On Unix/Mac:
openssl rand -base64 32

# On Windows PowerShell:
[Convert]::ToBase64String((1..32|ForEach-Object{[byte]0}|Get-Random -SetSeed $RANDOM))

# Or using Node.js (works everywhere):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## For DevOps/Infrastructure

### ✅ Deployment Configuration

When deploying, ensure these environment variables are set:

```env
# Required for all environments
NODE_ENV=production
PORT=4000
POSTGRES_USER=<secure-username>
POSTGRES_PASSWORD=<secure-password>
POSTGRES_DB=kpi_dashboard
POSTGRES_HOST=<database-host>
POSTGRES_PORT=5432
JWT_SECRET=<32+-char-random-string>
JWT_EXPIRY=1d
LOG_LEVEL=info
```

### ✅ Docker Deployment

The `.env` file is automatically loaded by:
1. Docker Compose (`env_file:` directive)
2. Docker Swarm (via config/secret files)
3. Kubernetes (via ConfigMap/Secret)

### ✅ Validation on Startup

The application validates all variables immediately on startup:
- If validation fails, container exits with code 1
- If validation passes, application starts normally
- This ensures no invalid configuration runs in production

### ✅ Monitoring

Watch for these in logs:
- ✅ "Database connection pool initialized"
- ✅ "Database connection successful"
- ✅ "Backend server listening on port 4000"
- ✅ "Environment: production" (or appropriate environment)

If you see "Environment validation failed", check the detailed error message above it.

## Reference

- Documentation: `ENV_CONFIGURATION.md`
- Example usage: `backend/src/config/env.example.ts`
- Configuration file: `backend/src/config/env.ts`
