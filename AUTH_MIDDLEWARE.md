# JWT Authentication Middleware Documentation

Complete guide for using the JWT authentication middleware in Express.js.

## Overview

The authentication middleware provides:
- ✅ JWT verification from httpOnly cookies
- ✅ Automatic user data attachment to requests
- ✅ Role-based authorization
- ✅ Restaurant access control
- ✅ Optional authentication support
- ✅ Type-safe Express Request extension
- ✅ Comprehensive error handling with logging

## Installation & Setup

### 1. Middleware Files

Two files are required:

```
backend/src/types/
  └── express.d.ts          ← Express Request type extension

backend/src/middleware/
  ├── auth.ts               ← Authentication middleware
  └── auth.example.ts       ← Usage examples
```

### 2. Dependencies (Already Installed)

```json
{
  "express": "^4.19.2",
  "cookie-parser": "^1.4.x",
  "jsonwebtoken": "^9.0.2"
}
```

Install cookie-parser if not present:
```bash
npm install cookie-parser
```

### 3. Setup in Express App

```typescript
import express from 'express';
import cookieParser from 'cookie-parser';
import { authenticate } from './middleware/auth';

const app = express();

// IMPORTANT: Initialize cookie-parser BEFORE auth middleware
app.use(cookieParser());
app.use(express.json());

// Now you can use auth middleware
app.get('/api/profile', authenticate, (req, res) => {
  res.json({ user: req.user });
});
```

---

## API Reference

### authenticate()

Main authentication middleware. Requires valid JWT in `auth_token` cookie.

**Signature:**
```typescript
function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void
```

**Returns:**
- Sets `req.user` with decoded token data
- Calls `next()` if valid token

**Errors:**
- **401** - Token missing or invalid
- **403** - Token expired
- **401** - Token payload malformed

**Usage:**
```typescript
app.get('/api/protected', authenticate, (req, res) => {
  // req.user is guaranteed to exist here
  console.log(req.user.userId);
});
```

**What Gets Attached to req.user:**
```typescript
{
  userId: string;           // User's unique ID
  email: string;            // User's email
  role: 'admin' | 'manager' | 'viewer';  // User's role
  restaurantId: string | null;  // null = admin, otherwise restaurant ID
}
```

---

### optionalAuth()

Optional authentication. Doesn't require valid token, but attaches user if valid.

**Signature:**
```typescript
function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void
```

**Returns:**
- Sets `req.user` if valid token found
- Always calls `next()` (never returns error)

**Usage:**
```typescript
app.get('/api/public', optionalAuth, (req, res) => {
  if (req.user) {
    // User is authenticated
    res.json({ message: `Welcome ${req.user.email}` });
  } else {
    // User is not authenticated
    res.json({ message: 'Welcome guest' });
  }
});
```

---

### authorize(...roles)

Role-based authorization. Requires `authenticate` to run first.

**Signature:**
```typescript
function authorize(
  ...allowedRoles: Array<'admin' | 'manager' | 'viewer'>
): (req: Request, res: Response, next: NextFunction) => void
```

**Parameters:**
- `allowedRoles` - One or more roles to allow

**Returns:**
- Calls `next()` if user has required role
- 403 error if user doesn't have required role

**Usage:**
```typescript
// Only admins
app.delete('/api/users/:id', authenticate, authorize('admin'), handler);

// Admins or managers
app.put('/api/settings', authenticate, authorize('admin', 'manager'), handler);

// Any authenticated user
app.get('/api/data', authenticate, authorize('admin', 'manager', 'viewer'), handler);
```

---

### requireRestaurantAccess()

Ensures user has access to requested restaurant.

**Signature:**
```typescript
function requireRestaurantAccess(
  req: Request,
  res: Response,
  next: NextFunction
): void
```

**Rules:**
- **Admins** (restaurantId === null): Access to all restaurants
- **Regular users**: Can only access their assigned restaurant

**Returns:**
- Calls `next()` if user has access
- 403 error if user doesn't have access
- 400 error if restaurantId not in params

**Usage:**
```typescript
// User can only access their assigned restaurant
app.get('/api/restaurants/:restaurantId/data', 
  authenticate, 
  requireRestaurantAccess, 
  handler);

// Combine with authorize for managers/admins only
app.put('/api/restaurants/:restaurantId/config',
  authenticate,
  authorize('admin', 'manager'),
  requireRestaurantAccess,
  handler);
```

**Example Behavior:**
```typescript
// Admin user (restaurantId === null)
req.params.restaurantId = 'restaurant_123'
// ✓ Access granted

// Manager user (restaurantId === 'restaurant_456')
req.params.restaurantId = 'restaurant_456'
// ✓ Access granted

// Manager user (restaurantId === 'restaurant_456')
req.params.restaurantId = 'restaurant_789'
// ✗ 403 Access denied
```

---

### adminOnly()

Shorthand for `authenticate` + `authorize('admin')`

**Signature:**
```typescript
function adminOnly(
  req: Request,
  res: Response,
  next: NextFunction
): void
```

**Usage:**
```typescript
// These are equivalent:
app.delete('/api/users/:id', authenticate, authorize('admin'), handler);
app.delete('/api/users/:id', adminOnly, handler);
```

---

### managerOrAdmin()

Shorthand for `authenticate` + `authorize('admin', 'manager')`

**Signature:**
```typescript
function managerOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void
```

**Usage:**
```typescript
// These are equivalent:
app.put('/config', authenticate, authorize('admin', 'manager'), handler);
app.put('/config', managerOrAdmin, handler);
```

---

## Express Type Extension

The `express.d.ts` file extends Express Request to include user data:

```typescript
declare namespace Express {
  export interface Request {
    user?: {
      userId: string;
      email: string;
      role: 'admin' | 'manager' | 'viewer';
      restaurantId: string | null;
    };
  }
}
```

**Benefits:**
- ✅ TypeScript autocomplete for `req.user`
- ✅ Type checking for user properties
- ✅ Prevents typos and runtime errors

**Example:**
```typescript
app.get('/api/profile', authenticate, (req, res) => {
  // TypeScript knows these are safe
  const id: string = req.user.userId;
  const role: 'admin' | 'manager' | 'viewer' = req.user.role;

  // This would be a TypeScript error:
  // const invalid = req.user.invalidProperty; // ✗ Error
});
```

---

## Common Patterns

### 1. Simple Protected Route

```typescript
app.get('/api/profile', authenticate, (req, res) => {
  res.json({
    message: 'Here is your profile',
    user: req.user,
  });
});
```

### 2. Role-Based Access

```typescript
// Admin-only
app.delete('/api/users/:id', authenticate, authorize('admin'), handler);

// Managers and admins
app.put('/api/reports/config', managerOrAdmin, handler);

// Any authenticated user (all roles)
app.get('/api/my-data', authenticate, handler);
```

### 3. Restaurant-Specific Access

```typescript
// User can only access their restaurant
app.get(
  '/api/restaurants/:restaurantId/sales',
  authenticate,
  requireRestaurantAccess,
  handler
);

// Combine with role check
app.patch(
  '/api/restaurants/:restaurantId/settings',
  authenticate,
  authorize('admin', 'manager'),
  requireRestaurantAccess,
  handler
);
```

### 4. Optional Authentication

```typescript
app.get('/api/public', optionalAuth, (req, res) => {
  if (req.user) {
    res.json({ data: 'Personalized for ' + req.user.email });
  } else {
    res.json({ data: 'Generic data for anonymous user' });
  }
});
```

### 5. Multiple Middleware Checks

```typescript
app.post(
  '/api/restaurants/:restaurantId/teams',
  authenticate,          // Step 1: Must be logged in
  authorize('admin', 'manager'),  // Step 2: Must be manager/admin
  requireRestaurantAccess,        // Step 3: Must have access to restaurant
  handler                         // Step 4: Process request
);
```

---

## Error Handling

### Authentication Errors

All errors are caught and return JSON responses:

| Status | Scenario |
|--------|----------|
| **401** | No token in cookie |
| **401** | Invalid or corrupted token |
| **403** | Token has expired |
| **401** | Token payload missing required fields |

### Example Error Responses

```typescript
// No token
{
  "error": "Authentication required",
  "message": "No authorization token provided"
}

// Invalid token
{
  "error": "Invalid authentication token",
  "message": "Token verification failed"
}

// Token expired
{
  "error": "Token expired",
  "message": "Your session has expired. Please login again."
}
```

### Accessing Error Information

Errors are logged via winston logger with context:

```typescript
// Backend logs will show:
// [ERROR] Authentication failed: Invalid token {
//   "path": "/api/profile",
//   "method": "GET",
//   "error": "jwt malformed"
// }
```

---

## Login & Logout Endpoints

### Login Endpoint

```typescript
import { generateToken } from './utils/jwt';
import { comparePassword } from './utils/crypto';

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user in database
    const user = await db.query(
      'SELECT id, email, password_hash, role, restaurant_id FROM users WHERE email = $1',
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const dbUser = user.rows[0];

    // 2. Verify password
    const passwordMatch = await comparePassword(password, dbUser.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Generate JWT token
    const token = generateToken({
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      restaurantId: dbUser.restaurant_id,
    });

    // 4. Set httpOnly cookie
    res.cookie('auth_token', token, {
      httpOnly: true,      // Cannot be accessed by JavaScript
      secure: true,        // HTTPS only (in production)
      sameSite: 'strict',  // CSRF protection
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // 5. Return success
    res.json({
      message: 'Login successful',
      user: {
        userId: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});
```

### Logout Endpoint

```typescript
app.post('/api/auth/logout', authenticate, (req, res) => {
  // Clear the httpOnly cookie
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  });

  res.json({ message: 'Logged out successfully' });
});
```

---

## Client-Side Integration

### Fetch API

```typescript
// Login to get httpOnly cookie
const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Include cookies
  body: JSON.stringify({ email: 'user@example.com', password: 'password' }),
});

// Access protected route
// Browser automatically includes auth_token cookie
const profileResponse = await fetch('http://localhost:4000/api/profile', {
  credentials: 'include',
});

const profile = await profileResponse.json();
// { user: { userId, email, role, restaurantId } }

// Logout
const logoutResponse = await fetch('http://localhost:4000/api/auth/logout', {
  method: 'POST',
  credentials: 'include',
});
```

### Axios

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  withCredentials: true, // Include cookies
});

// Login
const loginResponse = await api.post('/auth/login', {
  email: 'user@example.com',
  password: 'password',
});

// Axios automatically includes cookies in subsequent requests
const profile = await api.get('/profile');
// { user: { userId, email, role, restaurantId } }

// Handle 401 to redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token missing or invalid - redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## Testing

### Unit Test Examples

```typescript
import request from 'supertest';
import app from './server';
import { generateToken } from './utils/jwt';

describe('Authentication Middleware', () => {
  describe('authenticate', () => {
    test('allows request with valid token', async () => {
      const token = generateToken({
        userId: 'user_123',
        email: 'test@example.com',
        role: 'viewer',
        restaurantId: 'restaurant_456',
      });

      const response = await request(app)
        .get('/api/profile')
        .set('Cookie', `auth_token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user.userId).toBe('user_123');
    });

    test('rejects request without token', async () => {
      const response = await request(app).get('/api/profile');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    test('rejects request with expired token', async () => {
      // Generate token that's already expired
      const token = generateToken({
        userId: 'user_123',
        email: 'test@example.com',
        role: 'viewer',
        restaurantId: null,
      });

      // Wait for token to expire (or mock time)
      const response = await request(app)
        .get('/api/profile')
        .set('Cookie', `auth_token=${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Token expired');
    });
  });

  describe('authorize', () => {
    test('allows admin users', async () => {
      const token = generateToken({
        userId: 'user_123',
        email: 'admin@example.com',
        role: 'admin',
        restaurantId: null,
      });

      const response = await request(app)
        .delete('/api/users/other-user')
        .set('Cookie', `auth_token=${token}`);

      expect(response.status).toBe(200);
    });

    test('rejects non-admin users', async () => {
      const token = generateToken({
        userId: 'user_123',
        email: 'viewer@example.com',
        role: 'viewer',
        restaurantId: 'restaurant_456',
      });

      const response = await request(app)
        .delete('/api/users/other-user')
        .set('Cookie', `auth_token=${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('requireRestaurantAccess', () => {
    test('allows access to assigned restaurant', async () => {
      const token = generateToken({
        userId: 'user_123',
        email: 'manager@example.com',
        role: 'manager',
        restaurantId: 'restaurant_456',
      });

      const response = await request(app)
        .get('/api/restaurants/restaurant_456/sales')
        .set('Cookie', `auth_token=${token}`);

      expect(response.status).toBe(200);
    });

    test('denies access to other restaurants', async () => {
      const token = generateToken({
        userId: 'user_123',
        email: 'manager@example.com',
        role: 'manager',
        restaurantId: 'restaurant_456',
      });

      const response = await request(app)
        .get('/api/restaurants/restaurant_789/sales')
        .set('Cookie', `auth_token=${token}`);

      expect(response.status).toBe(403);
    });

    test('allows admin access to all restaurants', async () => {
      const token = generateToken({
        userId: 'user_123',
        email: 'admin@example.com',
        role: 'admin',
        restaurantId: null, // Admin has null restaurantId
      });

      const response = await request(app)
        .get('/api/restaurants/restaurant_789/sales')
        .set('Cookie', `auth_token=${token}`);

      expect(response.status).toBe(200);
    });
  });

  describe('optionalAuth', () => {
    test('allows request without token', async () => {
      const response = await request(app).get('/api/public');

      expect(response.status).toBe(200);
      expect(response.body.isAuthenticated).toBe(false);
    });

    test('includes user if token valid', async () => {
      const token = generateToken({
        userId: 'user_123',
        email: 'test@example.com',
        role: 'viewer',
        restaurantId: 'restaurant_456',
      });

      const response = await request(app)
        .get('/api/public')
        .set('Cookie', `auth_token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.isAuthenticated).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
    });
  });
});
```

---

## Security Best Practices

### ✅ DO:

1. **Always use httpOnly cookies for tokens**
   ```typescript
   res.cookie('auth_token', token, {
     httpOnly: true,  // Prevents XSS access
     secure: true,    // HTTPS only
     sameSite: 'strict',
   });
   ```

2. **Clear cookies on logout**
   ```typescript
   res.clearCookie('auth_token', { httpOnly: true, secure: true });
   ```

3. **Validate role and restaurant access together**
   ```typescript
   app.put(
     '/api/restaurants/:restaurantId/config',
     authenticate,
     authorize('admin', 'manager'),
     requireRestaurantAccess,
     handler
   );
   ```

4. **Use HTTPS in production**
   - `secure: true` on cookies
   - All authentication endpoints over HTTPS

5. **Log authentication events**
   - Login attempts
   - Logout events
   - Access denials

### ❌ DON'T:

1. **Never store token in localStorage**
   ```typescript
   // Bad - vulnerable to XSS
   localStorage.setItem('token', token);
   ```

2. **Never send token in URL**
   ```typescript
   // Bad - visible in browser history and logs
   window.location.href = `/callback?token=${token}`;
   ```

3. **Never expose error details**
   ```typescript
   // Bad - reveals too much info
   res.status(401).json({ error: 'User not found' });

   // Good - generic error
   res.status(401).json({ error: 'Invalid email or password' });
   ```

4. **Never skip role/restaurant checks**
   ```typescript
   // Bad - trusting client-side filters
   const restaurantId = req.body.restaurantId;

   // Good - verify server-side
   app.get(
     '/restaurants/:restaurantId/data',
     authenticate,
     requireRestaurantAccess, // Enforces server-side check
     handler
   );
   ```

---

## Troubleshooting

### Issue: "Authentication required" even with valid token

**Possible causes:**
1. Cookie not being sent (missing `credentials: 'include'` in fetch)
2. Cookie name mismatch (check for `auth_token` exactly)
3. Cookie cleared/expired

**Solution:**
```typescript
// Ensure cookie-parser is initialized first
app.use(cookieParser());
app.use(express.json());

// In client, always use credentials
fetch('/api/protected', { credentials: 'include' });
```

### Issue: CORS errors with cookies

**Cause:** CORS not configured properly for credentials

**Solution:**
```typescript
import cors from 'cors';

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));
```

### Issue: "Token expired" returning 403 but token should be valid

**Cause:** Token expiration time misconfigured

**Solution:**
- Check `JWT_EXPIRY` environment variable
- Verify system clock is correct
- Check token generation includes expiration

### Issue: req.user is undefined in protected route

**Cause:** authenticate middleware not running before route handler

**Solution:**
```typescript
// Wrong - middleware not applied
app.get('/api/profile', (req, res) => {
  console.log(req.user); // undefined!
});

// Correct - middleware applied
app.get('/api/profile', authenticate, (req, res) => {
  console.log(req.user); // { userId, email, role, restaurantId }
});
```

---

## Files Reference

| File | Purpose |
|------|---------|
| [backend/src/types/express.d.ts](backend/src/types/express.d.ts) | Express Request type extension |
| [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts) | Authentication middleware implementation |
| [backend/src/middleware/auth.example.ts](backend/src/middleware/auth.example.ts) | 14 usage examples |
| [backend/src/utils/jwt.ts](backend/src/utils/jwt.ts) | JWT utilities (token generation/verification) |
| [backend/src/utils/crypto.ts](backend/src/utils/crypto.ts) | Password hashing utilities |
| [CRYPTO_JWT_INTEGRATION.md](CRYPTO_JWT_INTEGRATION.md) | Complete authentication flow |

---

**Status:** ✅ Production Ready | **TypeScript:** ✅ Full Type Safety | **Testing:** ✅ Example Tests Included
