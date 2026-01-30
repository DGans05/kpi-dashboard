# Auth Service - Quick Reference

## TL;DR

```typescript
import { authService } from '../services/auth.service';
import { hashPassword } from '../utils/crypto';

// Login user
const user = await authService.login('john@example.com', 'password123');

// Register user
const hash = await hashPassword('password123');
const newUser = await authService.createUser('jane@example.com', hash, 'viewer');

// Get user info
const user = await authService.getUserById('user-uuid');

// Check if email exists
const exists = await authService.emailExists('john@example.com');
```

---

## Core Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `login(email, password)` | Authenticate user | UserResponse \| throws "Invalid credentials" |
| `createUser(email, hash, role, restaurantId)` | Register new user | UserResponse \| throws "Email already registered" |
| `getUserById(userId)` | Get user by ID | UserResponse \| null |
| `getUserByEmail(email)` | Get user by email | UserResponse \| null |
| `emailExists(email)` | Check if email registered | boolean |
| `getAllUsers(limit, offset)` | Get all users paginated | UserResponse[] |
| `updateUserRole(userId, role)` | Change user's role | UserResponse \| throws "User not found" |
| `deleteUser(userId)` | Delete user | void |

---

## Common Patterns

### 1. Login Endpoint

```typescript
app.post('/api/auth/login', async (req, res) => {
  try {
    const user = await authService.login(req.body.email, req.body.password);
    
    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
    });

    // Set cookie
    res.cookie('auth_token', token, { httpOnly: true, secure: true });
    
    res.json({ message: 'Login successful', user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});
```

### 2. Registration Endpoint

```typescript
app.post('/api/auth/register', async (req, res) => {
  try {
    // Check email available
    if (await authService.emailExists(req.body.email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hash = await hashPassword(req.body.password);

    // Create user
    const user = await authService.createUser(
      req.body.email,
      hash,
      'viewer', // Default role
      req.body.restaurantId
    );

    res.status(201).json({
      message: 'Registration successful',
      user,
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});
```

### 3. Get Profile (Protected)

```typescript
app.get('/api/auth/profile', authenticate, async (req, res) => {
  const user = await authService.getUserById(req.user.userId);
  res.json({ user });
});
```

### 4. Update User Role (Admin)

```typescript
app.put('/api/admin/users/:id/role', authenticate, authorize(['admin']), async (req, res) => {
  const user = await authService.updateUserRole(req.params.id, req.body.role);
  res.json({ message: 'Role updated', user });
});
```

---

## Error Handling

```typescript
try {
  const user = await authService.login(email, password);
} catch (error) {
  const msg = error instanceof Error ? error.message : 'Unknown error';

  if (msg === 'Invalid credentials') {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  
  if (msg === 'Email already registered') {
    return res.status(409).json({ error: 'Email in use' });
  }

  return res.status(500).json({ error: 'Server error' });
}
```

---

## User Type

```typescript
interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'viewer';
  restaurantId: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  restaurant?: {
    id: string;
    name: string;
    city: string;
  };
}
```

---

## Setup Checklist

- [ ] File: `backend/src/services/auth.service.ts` created
- [ ] Import: `import { authService } from '../services/auth.service'`
- [ ] Use crypto.hashPassword() before createUser()
- [ ] Handle errors: Invalid credentials (401), Email exists (409), Not found (404)
- [ ] Test login endpoint with valid/invalid credentials
- [ ] Test registration endpoint with existing email
- [ ] Verify password hashing works (don't store plain text)
- [ ] Integrate with middleware auth chain
- [ ] Create example routes in routes/auth.routes.ts

---

## Database

```sql
-- Must exist before using service
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'manager')),
  restaurant_id UUID REFERENCES restaurants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
```

---

## Important Notes

⚠️ **Password MUST be hashed before createUser()**

```typescript
// Wrong - will store hashed hash
const user = authService.createUser(email, password, role);

// Correct - hash first, then pass hash
const hash = await hashPassword(password);
const user = authService.createUser(email, hash, role);
```

---

## Next Steps

1. Create `backend/src/routes/auth.routes.ts` with login/register endpoints
2. Integrate middleware in main Express app
3. Test complete auth flow (register → login → access protected route)
4. Set up JWT token generation in login endpoint
5. Add logout endpoint (clear auth_token cookie)

---

**Reference:** [AUTH_SERVICE.md](AUTH_SERVICE.md) | **Examples:** [auth.service.example.ts](backend/src/services/auth.service.example.ts)
