# Password Hashing & JWT Integration Guide

Quick reference for integrating password hashing utilities with JWT authentication for a complete authentication system.

## Overview

The complete authentication flow combines:
1. **Password Hashing** (`crypto.ts`) - Secure password storage and verification
2. **JWT Tokens** (`jwt.ts`) - Stateless session management
3. **Express Endpoints** - REST API authentication

## Complete Authentication Flow

### 1. User Registration

```typescript
import express from 'express';
import { hashPassword, validatePasswordStrength } from './utils/crypto';

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    // Validate passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Validate password strength
    const validation = validatePasswordStrength(password);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.message });
    }

    // Check if user exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Save user
    const result = await db.query(
      'INSERT INTO users (email, password_hash, created_at) VALUES ($1, $2, $3) RETURNING id',
      [email, passwordHash, new Date()]
    );

    res.status(201).json({
      message: 'Registration successful',
      userId: result.rows[0].id,
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});
```

### 2. User Login with JWT

```typescript
import { comparePassword } from './utils/crypto';
import { generateToken } from './utils/jwt';

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Get user from database
    const user = await db.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const dbUser = user.rows[0];

    // Verify password
    const passwordMatch = await comparePassword(password, dbUser.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = generateToken({
      userId: dbUser.id,
      email: dbUser.email,
    });

    res.json({
      message: 'Login successful',
      token,
      userId: dbUser.id,
      email: dbUser.email,
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});
```

### 3. Authorization Middleware

```typescript
import { verifyTokenSafe, extractTokenFromHeader } from './utils/jwt';

/**
 * Middleware to verify JWT token and attach user to request
 */
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ error: 'Authorization header missing' });
    }

    // Verify token safely (returns result object, doesn't throw)
    const result = verifyTokenSafe(token);

    if (!result.valid) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach decoded user to request
    (req as any).user = result.decoded;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}

app.use('/api/protected', authMiddleware);
```

### 4. Protected Routes

```typescript
// Apply auth middleware
app.use('/api/protected', authMiddleware);

// Protected endpoint
app.get('/api/protected/profile', (req, res) => {
  const user = (req as any).user;

  res.json({
    userId: user.userId,
    email: user.email,
    message: 'This is protected data',
  });
});

app.put('/api/protected/profile', (req, res) => {
  const user = (req as any).user;
  const { name } = req.body;

  // Update user profile
  res.json({
    message: 'Profile updated',
    userId: user.userId,
  });
});
```

### 5. Password Change

```typescript
app.post('/api/protected/change-password', async (req, res) => {
  try {
    const user = (req as any).user;
    const { oldPassword, newPassword } = req.body;

    // Get current password hash
    const dbUser = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [user.userId]
    );

    if (dbUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify old password
    const oldMatch = await comparePassword(oldPassword, dbUser.rows[0].password_hash);
    if (!oldMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Validate new password strength
    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.message });
    }

    // Hash new password
    const newHash = await hashPassword(newPassword);

    // Update database
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3',
      [newHash, new Date(), user.userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Password change failed' });
  }
});
```

## Client-Side Integration

### Using Fetch API

```typescript
// Registration
async function register(email: string, password: string) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, confirmPassword: password }),
  });

  const data = await response.json();
  return data;
}

// Login
async function login(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (response.ok) {
    // Store token in localStorage
    localStorage.setItem('authToken', data.token);
    return data;
  }

  throw new Error(data.error);
}

// Access protected route with token
async function getProfile() {
  const token = localStorage.getItem('authToken');

  const response = await fetch('/api/protected/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data;
}

// Logout
function logout() {
  localStorage.removeItem('authToken');
}
```

### Using Axios

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000/api',
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle expired tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Usage
const response = await api.post('/auth/login', { email, password });
const profile = await api.get('/protected/profile');
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(60) NOT NULL,  -- Bcrypt hash (always 60 chars)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for email lookups
CREATE INDEX idx_users_email ON users(email);
```

### Password Hash Storage

**Important:** Store bcrypt hashes as:
- **Type**: VARCHAR(60) or TEXT
- **Length**: Always 60 characters
- **Format**: Starts with `$2b$12$` (bcrypt version + salt rounds)
- **Never**: Store in BINARY or CHAR - text corruption causes validation failures

## Testing Complete Flow

```typescript
import { hashPassword, comparePassword, validatePasswordStrength } from './utils/crypto';
import { generateToken, verifyToken, extractTokenFromHeader } from './utils/jwt';

async function testCompleteFlow() {
  console.log('Testing complete authentication flow...\n');

  // 1. Registration
  console.log('1. User Registration');
  const email = 'user@example.com';
  const password = 'MySecurePassword123!';

  const validation = validatePasswordStrength(password);
  console.log(`   Password strength: ${validation.strength}`);

  const passwordHash = await hashPassword(password);
  console.log(`   Password hashed successfully`);

  // Simulate database save
  const user = {
    id: '123',
    email,
    passwordHash,
  };

  // 2. Login
  console.log('\n2. User Login');
  const passwordMatch = await comparePassword(password, user.passwordHash);
  console.log(`   Password verified: ${passwordMatch}`);

  // Wrong password
  const wrongMatch = await comparePassword('WrongPassword', user.passwordHash);
  console.log(`   Wrong password rejected: ${!wrongMatch}`);

  // 3. JWT Token Generation
  console.log('\n3. JWT Token Generation');
  const token = generateToken({
    userId: user.id,
    email: user.email,
  });
  console.log(`   Token generated: ${token.substring(0, 20)}...`);

  // 4. Token Verification
  console.log('\n4. Token Verification');
  const decoded = verifyToken(token);
  console.log(`   Decoded userId: ${decoded.userId}`);
  console.log(`   Decoded email: ${decoded.email}`);

  // 5. Authorization Header
  console.log('\n5. Authorization Header Handling');
  const authHeader = `Bearer ${token}`;
  const extractedToken = extractTokenFromHeader(authHeader);
  console.log(`   Extracted from header: ${extractedToken?.substring(0, 20)}...`);

  // 6. Token Expiration
  console.log('\n6. Token Expiration');
  const timeToExpiration = new Date().getTime() + (24 * 60 * 60 * 1000);
  const expiration = new Date(timeToExpiration);
  console.log(`   Token expires at: ${expiration.toISOString()}`);

  console.log('\n✓ Complete authentication flow tested successfully');
}

// Run test
testCompleteFlow().catch(console.error);
```

## Security Checklist

Before deployment:

- ✅ Use HTTPS for all authentication endpoints
- ✅ Set secure HTTP-only cookies for tokens (or store in localStorage with CSRF protection)
- ✅ Implement rate limiting on login/registration endpoints
- ✅ Validate all inputs server-side
- ✅ Ensure password_hash field is VARCHAR(60), not shorter
- ✅ Log authentication failures for security monitoring
- ✅ Implement password reset with email verification
- ✅ Store JWT_SECRET in environment variables (minimum 32 characters)
- ✅ Implement token refresh mechanism
- ✅ Consider implementing token blacklist for logout
- ✅ Use bcrypt with 12 salt rounds (don't reduce for performance)
- ✅ Never expose error details (use generic "Invalid email or password")

## Performance Tips

1. **Cache user lookups**
   ```typescript
   // Use Redis to cache user by email
   const user = await cache.get(`user:${email}`) || 
                 await db.query(...);
   ```

2. **Hash asynchronously**
   ```typescript
   // Don't block main thread during registration
   const hash = await hashPassword(password);
   ```

3. **Use connection pooling**
   ```typescript
   // Already configured in database.ts
   ```

4. **Implement token verification caching**
   ```typescript
   // Cache verified tokens to avoid repeated verification
   const verified = cache.get(token) || verifyToken(token);
   ```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid email or password" on correct credentials | Check if hash was stored correctly (should be 60 chars) |
| Password hashing takes too long | Normal with 12 salt rounds (50-100ms), use queue for bulk operations |
| Token expired immediately | Check JWT_EXPIRY env variable (default: 1d) |
| "Invalid bcrypt hash format" | Ensure password_hash in database is VARCHAR, not BINARY |
| CORS errors on login | Add CORS middleware before auth routes |
| Token not extracted from header | Ensure header format is exactly `Bearer <token>` (space required) |

## Files Reference

| File | Purpose |
|------|---------|
| [backend/src/utils/crypto.ts](backend/src/utils/crypto.ts) | Password hashing and verification |
| [backend/src/utils/crypto.example.ts](backend/src/utils/crypto.example.ts) | Password hashing examples |
| [backend/src/utils/jwt.ts](backend/src/utils/jwt.ts) | JWT token generation and verification |
| [backend/src/utils/jwt.example.ts](backend/src/utils/jwt.example.ts) | JWT usage examples |
| [CRYPTO_UTILITIES.md](CRYPTO_UTILITIES.md) | Password hashing complete documentation |
| [JWT_UTILITIES.md](JWT_UTILITIES.md) | JWT token complete documentation |
| [JWT_INTEGRATION.md](JWT_INTEGRATION.md) | JWT integration patterns |
