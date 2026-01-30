# JWT Token Utilities

## Overview

A complete JWT (JSON Web Token) authentication system for managing user tokens with expiration, verification, and detailed payload handling.

## Files Created

### `backend/src/utils/jwt.ts`
Complete JWT token generation and verification utilities.

### `backend/src/utils/jwt.example.ts`
Comprehensive examples and usage patterns.

## Core Functions

### `generateToken(payload: JWTPayload): string`

Generates a signed JWT token for a user.

**Parameters:**
- `payload.userId`: Unique user identifier
- `payload.email`: User email address
- `payload.role`: User role (admin, staff, user, etc.)
- `payload.restaurantId`: Associated restaurant ID (can be null)

**Returns:** Signed JWT token string

**Throws:** Error if token generation fails

**Example:**
```typescript
const token = generateToken({
  userId: 'user-123',
  email: 'user@example.com',
  role: 'admin',
  restaurantId: 'restaurant-456',
});

console.log(token); // eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Features:**
- ✅ Uses HS256 algorithm
- ✅ Automatic expiration based on JWT_EXPIRY config
- ✅ Detailed logging for debugging
- ✅ Error handling with descriptive messages

---

### `verifyToken(token: string): DecodedToken`

Verifies a JWT token and returns the decoded payload.

**Parameters:**
- `token`: JWT token string to verify

**Returns:** Decoded payload with iat and exp claims

**Throws:**
- `"Token has expired"` - If token has exceeded expiration time
- `"Invalid token"` - If token signature is invalid
- `"Token verification failed"` - For other verification errors

**Example:**
```typescript
try {
  const decoded = verifyToken(token);
  console.log('User:', decoded.userId);
  console.log('Expires at:', new Date(decoded.exp * 1000));
} catch (error) {
  console.error('Verification failed:', error.message);
}
```

**Features:**
- ✅ Verifies signature with JWT_SECRET
- ✅ Checks expiration automatically
- ✅ Graceful error handling
- ✅ Uses HS256 algorithm

---

### `verifyTokenSafe(token: string): VerificationResult`

Safe token verification that returns a result object instead of throwing.

**Returns:**
```typescript
{
  success: boolean;
  payload?: DecodedToken;  // Only if success is true
  error?: string;          // Only if success is false
}
```

**Example:**
```typescript
const result = verifyTokenSafe(token);

if (result.success && result.payload) {
  console.log('Valid token for:', result.payload.email);
} else {
  console.log('Error:', result.error);
}
```

**Use Cases:**
- Middleware authentication
- Conditional logic without try-catch
- API responses with error details

---

### `extractTokenFromHeader(authHeader: string | undefined): string | null`

Extracts the token from an Authorization header.

**Parameters:**
- `authHeader`: Authorization header value (e.g., "Bearer <token>")

**Returns:** Token string or null if invalid

**Example:**
```typescript
const token = extractTokenFromHeader(req.headers.authorization);

if (!token) {
  return res.status(401).json({ error: 'Missing token' });
}

// Use token for verification
const decoded = verifyToken(token);
```

**Accepted Formats:**
- ✅ `"Bearer eyJhbGciOiJIUzI1NiIs..."`
- ❌ Missing header → null
- ❌ `"InvalidToken"` → null (no Bearer prefix)
- ❌ `"Bearer"` → null (no token part)
- ❌ `"Bearer token1 token2"` → null (too many parts)

---

### `decodeTokenWithoutVerification(token: string): DecodedToken | null`

Decodes token payload without verifying the signature.

**WARNING:** Only use for inspection. Do not make security decisions based on this!

**Returns:** Decoded payload or null if decoding fails

**Example:**
```typescript
const payload = decodeTokenWithoutVerification(token);
if (payload) {
  console.log('User ID from token:', payload.userId);
}
```

---

### `getTokenExpiration(token: string): number | null`

Gets the token expiration timestamp in milliseconds.

**Returns:** Milliseconds since epoch, or null if invalid

**Example:**
```typescript
const expiresMs = getTokenExpiration(token);
if (expiresMs) {
  const expiresAt = new Date(expiresMs);
  console.log('Expires at:', expiresAt.toISOString());
}
```

---

### `isTokenExpired(token: string): boolean`

Checks if a token has expired.

**Returns:** true if expired, false if valid

**Example:**
```typescript
if (isTokenExpired(token)) {
  console.log('Token has expired, please login again');
} else {
  console.log('Token is still valid');
}
```

---

### `getTimeToTokenExpiration(token: string): number`

Gets remaining time until token expires in milliseconds.

**Returns:** Milliseconds remaining (0 if already expired/invalid)

**Example:**
```typescript
const msRemaining = getTimeToTokenExpiration(token);
const secondsRemaining = Math.floor(msRemaining / 1000);
const minutesRemaining = Math.floor(secondsRemaining / 60);

if (msRemaining < 5 * 60 * 1000) {
  console.log('Token expires in less than 5 minutes');
}
```

---

## Type Definitions

### `JWTPayload`
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  restaurantId: string | null;
}
```

### `DecodedToken`
```typescript
interface DecodedToken extends JWTPayload {
  iat: number;  // Issued at (seconds since epoch)
  exp: number;  // Expiration (seconds since epoch)
}
```

### `VerificationResult`
```typescript
interface VerificationResult {
  success: boolean;
  payload?: DecodedToken;
  error?: string;
}
```

---

## Common Usage Patterns

### Authentication Middleware

```typescript
import express from 'express';
import { extractTokenFromHeader, verifyTokenSafe } from '@/utils/jwt';

app.use((req, res, next) => {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const result = verifyTokenSafe(token);

  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }

  // Attach user to request
  (req as any).user = result.payload;
  next();
});
```

### Login Endpoint

```typescript
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  // Authenticate user
  const user = await User.findByEmail(email);
  if (!user || !await user.verifyPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    restaurantId: user.restaurantId,
  });

  res.json({ token });
});
```

### Token Refresh Logic

```typescript
// Middleware to refresh expiring tokens
app.use((req, res, next) => {
  const token = extractTokenFromHeader(req.headers.authorization);
  if (!token) {
    return next();
  }

  const msRemaining = getTimeToTokenExpiration(token);
  const hoursRemaining = msRemaining / (1000 * 60 * 60);

  // Refresh if less than 1 hour remaining
  if (hoursRemaining < 1) {
    const user = (req as any).user;
    const newToken = generateToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
    });

    res.setHeader('X-New-Token', newToken);
  }

  next();
});
```

### Protected Route

```typescript
app.get('/api/user/profile', (req, res) => {
  const user = (req as any).user;

  res.json({
    id: user.userId,
    email: user.email,
    role: user.role,
  });
});
```

---

## Configuration

The JWT utilities use these environment variables from `config`:

| Variable | Value |
|----------|-------|
| `JWT_SECRET` | 32+ character signing secret |
| `JWT_EXPIRY` | Expiration duration (e.g., "1d", "24h", "3600s") |

Both are validated on application startup. See `ENV_CONFIGURATION.md` for details.

---

## Error Handling

### Generation Errors
```typescript
try {
  const token = generateToken(payload);
  // Use token...
} catch (error) {
  logger.error('Failed to generate token:', error.message);
  res.status(500).json({ error: 'Token generation failed' });
}
```

### Verification Errors
```typescript
try {
  const decoded = verifyToken(token);
  // Use decoded payload...
} catch (error) {
  if (error.message === 'Token has expired') {
    res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
  } else {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Safe Verification
```typescript
const result = verifyTokenSafe(token);
if (!result.success) {
  // Handle error gracefully
  console.log('Verification failed:', result.error);
}
```

---

## Best Practices

1. **Use `verifyTokenSafe()` in middleware** - Better error handling
2. **Use `verifyToken()` in critical paths** - Fail loudly if something is wrong
3. **Always validate role and restaurantId** - Don't just trust userId
4. **Refresh expiring tokens** - Use `getTimeToTokenExpiration()` to check
5. **Log token operations** - Generated automatically for debugging
6. **Store tokens securely** - Use HttpOnly cookies or secure storage
7. **Never decode unverified tokens** - Only for inspection, not decisions
8. **Handle expiration gracefully** - Offer login again or refresh flow
9. **Include request info in logs** - Helps with security auditing
10. **Test all error scenarios** - Expired, invalid, missing tokens

---

## Security Considerations

✅ **Secure Algorithms**
- Uses HS256 (HMAC-SHA256)
- Validates signatures on verification

✅ **Token Expiration**
- Configured via JWT_EXPIRY
- Enforced on verification
- Helpful errors for expired tokens

✅ **Secret Management**
- JWT_SECRET validated on startup
- Minimum 32 characters for security
- Never exposed in logs

✅ **Error Messages**
- Descriptive but not revealing
- Logged with full details
- Safe for client display

⚠️ **Client-Side Storage**
- Use HttpOnly cookies when possible
- Never store in localStorage
- Always send in Authorization header

---

## Testing

```typescript
import { generateToken, verifyToken, isTokenExpired } from '@/utils/jwt';

describe('JWT Utilities', () => {
  it('generates and verifies tokens', () => {
    const payload = { userId: 'user-1', email: 'test@example.com', role: 'user', restaurantId: null };
    const token = generateToken(payload);
    const decoded = verifyToken(token);
    
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });

  it('rejects expired tokens', () => {
    // Set very short expiry in config for testing
    const token = generateToken(payload);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    expect(() => verifyToken(token)).toThrow('Token has expired');
  });
});
```

---

## Related Files

- Configuration: [backend/src/config/env.ts](backend/src/config/env.ts)
- Logger: [backend/src/config/logger.ts](backend/src/config/logger.ts)
- Examples: [backend/src/utils/jwt.example.ts](backend/src/utils/jwt.example.ts)
