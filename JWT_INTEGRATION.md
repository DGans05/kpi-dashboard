# JWT Authentication Integration Guide

## Quick Start

### 1. Import JWT Functions

```typescript
import { 
  generateToken, 
  verifyToken, 
  verifyTokenSafe,
  extractTokenFromHeader 
} from '@/utils/jwt';
```

### 2. Create Login Route

```typescript
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Authenticate user (TODO: implement user lookup)
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

### 3. Add Authentication Middleware

```typescript
import { extractTokenFromHeader, verifyTokenSafe } from '@/utils/jwt';

app.use('/api', (req, res, next) => {
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }
  
  const result = verifyTokenSafe(token);
  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }
  
  (req as any).user = result.payload;
  next();
});
```

### 4. Use in Route

```typescript
app.get('/api/user/profile', (req, res) => {
  const user = (req as any).user;
  res.json({
    userId: user.userId,
    email: user.email,
    role: user.role,
  });
});
```

---

## Integration Patterns

### Authorization by Role

```typescript
function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    const user = req.user;
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Usage:
app.delete('/api/restaurants/:id', requireRole('admin'), (req, res) => {
  // Only admin users can delete
});
```

### Restaurant Access Control

```typescript
function requireRestaurant() {
  return (req: any, res: any, next: any) => {
    const user = req.user;
    if (!user.restaurantId) {
      return res.status(403).json({ error: 'No restaurant access' });
    }
    req.restaurantId = user.restaurantId;
    next();
  };
}

// Usage:
app.get('/api/restaurants/:id/staff', 
  requireRole('manager', 'admin'),
  requireRestaurant(),
  (req, res) => {
    // Access req.restaurantId
  }
);
```

### Token Refresh

```typescript
app.post('/api/auth/refresh', (req, res) => {
  const token = extractTokenFromHeader(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }
  
  const result = verifyTokenSafe(token);
  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }
  
  const user = result.payload;
  const newToken = generateToken({
    userId: user.userId,
    email: user.email,
    role: user.role,
    restaurantId: user.restaurantId,
  });
  
  res.json({ token: newToken });
});
```

### Logout (Client-Side Token Removal)

```typescript
// On frontend:
app.post('/api/auth/logout', (req, res) => {
  // Token invalidation happens when user clears from client
  // To implement server-side token blacklist:
  const token = extractTokenFromHeader(req.headers.authorization);
  
  // TODO: Add token to blacklist (Redis, database, etc.)
  // tokenBlacklist.add(token, getTokenExpiration(token));
  
  res.json({ message: 'Logged out successfully' });
});
```

---

## Error Handling Examples

### Try-Catch Pattern

```typescript
try {
  const decoded = verifyToken(token);
  console.log('User verified:', decoded.email);
} catch (error) {
  if (error.message === 'Token has expired') {
    res.status(401).json({ 
      error: 'Token expired',
      code: 'TOKEN_EXPIRED' 
    });
  } else if (error.message === 'Invalid token') {
    res.status(401).json({ 
      error: 'Invalid token',
      code: 'INVALID_TOKEN' 
    });
  } else {
    res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR' 
    });
  }
}
```

### Safe Pattern

```typescript
const result = verifyTokenSafe(token);

if (result.success && result.payload) {
  const user = result.payload;
  // Process authenticated request
} else {
  const errorCode = result.error?.includes('expired') 
    ? 'TOKEN_EXPIRED' 
    : 'INVALID_TOKEN';
  
  res.status(401).json({ 
    error: result.error,
    code: errorCode 
  });
}
```

---

## Testing Examples

### Unit Tests

```typescript
import { generateToken, verifyToken, isTokenExpired } from '@/utils/jwt';

describe('JWT Token Operations', () => {
  const payload = {
    userId: 'test-user-1',
    email: 'test@example.com',
    role: 'admin',
    restaurantId: 'rest-123',
  };

  it('generates valid tokens', () => {
    const token = generateToken(payload);
    expect(token).toBeTruthy();
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  it('verifies valid tokens', () => {
    const token = generateToken(payload);
    const decoded = verifyToken(token);
    
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  it('rejects invalid signatures', () => {
    const token = generateToken(payload);
    const tampered = token.slice(0, -1) + 'X'; // Change last char
    
    expect(() => verifyToken(tampered)).toThrow('Invalid token');
  });

  it('rejects expired tokens', async () => {
    // Note: Set JWT_EXPIRY to very short duration for testing
    const token = generateToken(payload);
    await new Promise(r => setTimeout(r, 1100)); // Wait for expiry
    
    expect(() => verifyToken(token)).toThrow('Token has expired');
  });
});
```

### Integration Tests

```typescript
import request from 'supertest';
import app from '@/app';

describe('Authentication Endpoints', () => {
  it('login returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@example.com',
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('protected endpoint requires token', async () => {
    const res = await request(app)
      .get('/api/user/profile');

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Missing token');
  });

  it('protected endpoint works with valid token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password123' });

    const token = loginRes.body.token;

    const res = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('user@example.com');
  });
});
```

---

## Client-Side Integration

### Fetch with Token

```typescript
// Store token after login
let authToken = localStorage.getItem('authToken');

// Add token to requests
async function apiCall(url: string, options?: RequestInit) {
  const headers = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, { ...options, headers });

  // Handle token refresh
  if (response.status === 401) {
    // Try to refresh token
    const refreshRes = await fetch('/api/auth/refresh', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      authToken = data.token;
      localStorage.setItem('authToken', authToken);
      
      // Retry original request
      return apiCall(url, options);
    } else {
      // Redirect to login
      window.location.href = '/login';
    }
  }

  return response;
}
```

### Axios Interceptor

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// Request interceptor: Add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle expiry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token might be expired, try refresh
      try {
        const { data } = await api.post('/auth/refresh');
        localStorage.setItem('authToken', data.token);
        
        // Retry original request
        return api.request(error.config);
      } catch {
        // Redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## Security Checklist

- [ ] JWT_SECRET is at least 32 characters
- [ ] JWT_SECRET is stored securely (environment variable)
- [ ] JWT_EXPIRY is set to reasonable value (e.g., 1d)
- [ ] All protected routes have authentication middleware
- [ ] Authorization checks verify role and restaurant access
- [ ] Expired tokens are handled gracefully
- [ ] Invalid tokens return 401, not 500
- [ ] Tokens are stored securely on client (HttpOnly cookies)
- [ ] HTTPS is used in production
- [ ] Token verification errors are logged
- [ ] No sensitive data exposed in error messages
- [ ] Token refresh is implemented
- [ ] Logout clears tokens on client
- [ ] CORS is properly configured

---

## Troubleshooting

### "JWT_SECRET must be at least 32 characters"

**Problem:** JWT_SECRET in .env is too short

**Solution:** Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### "Token has expired"

**Problem:** Using an expired token

**Solution:** Implement token refresh:
```typescript
const result = verifyTokenSafe(token);
if (result.error?.includes('expired')) {
  // Request new token from /api/auth/refresh
}
```

### "Invalid token"

**Problem:** Token is corrupted or tampered with

**Solution:** Clear token and redirect to login:
```typescript
localStorage.removeItem('authToken');
window.location.href = '/login';
```

### "Missing token"

**Problem:** Authorization header is missing

**Solution:** Ensure token is being sent:
```typescript
headers: { Authorization: `Bearer ${token}` }
```

### "No overload matches" TypeScript error

**Problem:** Using jwt.sign without proper type assertion

**Solution:** Use `as jwt.SignOptions`:
```typescript
jwt.sign(payload, secret, options as jwt.SignOptions)
```

---

## Performance Tips

1. **Cache verified tokens** - Don't reverify every request
2. **Use token refresh** - Reduce time required for new logins
3. **Set reasonable expiry** - Balance security vs. user experience
4. **Avoid database lookups** - Trust JWT payload for basic info
5. **Log strategically** - Debug info, not verbose on every request

---

## Next Steps

1. Implement User login endpoint
2. Add database user lookup and password verification
3. Create authorization middleware for roles
4. Implement token refresh endpoint
5. Add token blacklist for logout
6. Configure HTTPS in production
7. Add rate limiting to login endpoint
8. Implement 2FA (optional)

---

## Related Documentation

- JWT Utilities: [JWT_UTILITIES.md](JWT_UTILITIES.md)
- Environment Configuration: [ENV_CONFIGURATION.md](ENV_CONFIGURATION.md)
- Example Usage: [backend/src/utils/jwt.example.ts](backend/src/utils/jwt.example.ts)
