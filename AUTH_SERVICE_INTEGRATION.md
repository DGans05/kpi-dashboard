# Auth Service Integration Guide

How to integrate the authentication service into your Express app.

---

## Step 1: Create Auth Routes File

**File:** `backend/src/routes/auth.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { hashPassword, validatePasswordStrength } from '../utils/crypto';
import { generateToken } from '../utils/jwt';
import { authenticate } from '../middleware/auth';
import { logger } from '../config/logger';

const router = Router();

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, passwordConfirm, restaurantId } = req.body;

    // ========== Validation ==========
    if (!email || !password || !passwordConfirm) {
      return res.status(400).json({
        error: 'Missing required fields: email, password, passwordConfirm',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
      });
    }

    // Check passwords match
    if (password !== passwordConfirm) {
      return res.status(400).json({
        error: 'Passwords do not match',
      });
    }

    // Validate password strength
    const strengthResult = validatePasswordStrength(password);
    if (!strengthResult.isValid) {
      return res.status(400).json({
        error: 'Password too weak',
        feedback: strengthResult.feedback,
      });
    }

    // Check email availability
    const emailExists = await authService.emailExists(email);
    if (emailExists) {
      return res.status(409).json({
        error: 'Email already registered',
      });
    }

    // ========== User Creation ==========
    const passwordHash = await hashPassword(password);
    const user = await authService.createUser(
      email.toLowerCase(),
      passwordHash,
      'viewer', // Default role for new users
      restaurantId || null
    );

    logger.info('User registered', { userId: user.id, email });

    res.status(201).json({
      message: 'Registration successful. Please log in.',
      user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Registration error', { email: req.body.email, error: message });

    if (message === 'Email already registered') {
      return res.status(409).json({ error: 'Email already in use' });
    }

    res.status(500).json({
      error: 'Registration failed',
      message: process.env.NODE_ENV === 'development' ? message : undefined,
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and set auth_token cookie
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // ========== Validation ==========
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    // ========== Authentication ==========
    const user = await authService.login(email, password);

    // ========== Token Generation ==========
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
    });

    // ========== Set Cookie ==========
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    logger.info('User logged in', { userId: user.id, email });

    res.status(200).json({
      message: 'Login successful',
      user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('Login failed', { email: req.body.email, error: message });

    if (message === 'Invalid credentials') {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    if (message === 'Account disabled') {
      return res.status(403).json({
        error: 'Account has been disabled',
      });
    }

    res.status(500).json({
      error: 'Login failed',
      message: process.env.NODE_ENV === 'development' ? message : undefined,
    });
  }
});

/**
 * POST /api/auth/logout
 * Clear auth_token cookie
 */
router.post('/logout', authenticate, (req: Request, res: Response) => {
  try {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    logger.info('User logged out', { userId: req.user?.userId });

    res.status(200).json({
      message: 'Logout successful',
    });
  } catch (error) {
    logger.error('Logout error', { error });
    res.status(500).json({
      error: 'Logout failed',
    });
  }
});

/**
 * GET /api/auth/profile
 * Get current user's profile
 */
router.get('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await authService.getUserById(req.user!.userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    res.status(200).json({
      user,
    });
  } catch (error) {
    logger.error('Get profile error', { userId: req.user?.userId, error });
    res.status(500).json({
      error: 'Failed to fetch profile',
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify authentication (return user if authenticated)
 */
router.get('/verify', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await authService.getUserById(req.user!.userId);

    if (!user) {
      return res.status(401).json({
        authenticated: false,
      });
    }

    res.status(200).json({
      authenticated: true,
      user,
    });
  } catch (error) {
    res.status(401).json({
      authenticated: false,
    });
  }
});

export { router as authRouter };
```

---

## Step 2: Add Routes to Main App

**File:** `backend/src/server.ts`

```typescript
import { authRouter } from './routes/auth.routes';
import cookieParser from 'cookie-parser';

// ... existing imports ...

const app = express();

// ========== Middleware ==========
app.use(cors());
app.use(express.json());
app.use(cookieParser()); // ADD THIS - for parsing cookies
app.use(requestLogger);

// ========== Routes ==========
app.use('/health', healthRouter);
app.use('/api/auth', authRouter); // ADD THIS - auth routes

// ... rest of routes ...

app.use(errorHandler);

// ... rest of server setup ...
```

---

## Step 3: Verify Database Schema

**File:** `database/init.sql`

Ensure your users table has all required columns:

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,  -- Must be VARCHAR/TEXT, not BINARY
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'viewer')),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
```

---

## Step 4: Test the Endpoints

### Test Registration

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass123!",
    "passwordConfirm": "SecurePass123!"
  }'

# Response:
# {
#   "message": "Registration successful. Please log in.",
#   "user": {
#     "id": "uuid...",
#     "email": "testuser@example.com",
#     "role": "viewer",
#     "restaurantId": null,
#     ...
#   }
# }
```

### Test Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass123!"
  }'

# Response:
# {
#   "message": "Login successful",
#   "user": { ... }
# }
# (auth_token cookie set automatically)
```

### Test Profile (Authenticated)

```bash
curl http://localhost:4000/api/auth/profile \
  -H "Cookie: auth_token=<token_from_login>"

# Response:
# {
#   "user": { ... }
# }
```

### Test Logout

```bash
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Cookie: auth_token=<token_from_login>"

# Response:
# {
#   "message": "Logout successful"
# }
# (auth_token cookie cleared)
```

---

## Step 5: Protect Routes

Use the authentication and authorization middleware:

```typescript
import { authenticate } from './middleware/auth';
import { authorize, requireAdmin } from './middleware/authorize';

// Public endpoint
app.get('/api/public/data', (req, res) => {
  res.json({ data: 'public' });
});

// Protected endpoint (any authenticated user)
app.get('/api/protected/data', authenticate, (req, res) => {
  res.json({ userId: req.user!.userId });
});

// Admin-only endpoint
app.delete('/api/admin/users/:id', authenticate, requireAdmin, async (req, res) => {
  await authService.deleteUser(req.params.id);
  res.json({ message: 'User deleted' });
});

// Manager+ endpoint
app.post('/api/kpi', authenticate, authorize(['admin', 'manager']), (req, res) => {
  res.json({ message: 'KPI created' });
});
```

---

## Step 6: Environment Variables

Add to `.env` or `.env.local`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/kpi_dashboard

# JWT
JWT_SECRET=your-secret-key-min-32-chars-long
JWT_EXPIRATION=24h

# App
NODE_ENV=development
PORT=4000
```

---

## Integration Checklist

- [ ] `auth.routes.ts` created with all 4 endpoints
- [ ] Routes imported in `server.ts`
- [ ] `cookieParser()` middleware added
- [ ] Database `users` table exists
- [ ] JWT secret configured in environment
- [ ] Database connection pool working
- [ ] Crypto utilities working (`hashPassword`, `comparePassword`)
- [ ] Tested registration endpoint
- [ ] Tested login endpoint (verify cookie set)
- [ ] Tested profile endpoint (with auth token)
- [ ] Tested logout endpoint (verify cookie cleared)
- [ ] Tested protected routes return 401 without token
- [ ] Tested admin routes return 403 without admin role
- [ ] Error handling works (invalid password, email exists, etc.)

---

## Complete Flow Diagram

```
1. User Registers
   POST /api/auth/register
   → validatePasswordStrength()
   → hashPassword()
   → authService.createUser()
   → Database INSERT
   → Response with user object

2. User Logs In
   POST /api/auth/login
   → authService.login()
   → comparePassword()
   → updateLastLogin()
   → generateToken()
   → Set auth_token cookie
   → Response with user object

3. User Accesses Protected Resource
   GET /api/protected
   + Cookie: auth_token=<JWT>
   → authenticate middleware
   → verifyToken()
   → Attach req.user
   → Handler processes request
   → Response with data

4. User Logs Out
   POST /api/auth/logout
   + Cookie: auth_token=<JWT>
   → authenticate middleware
   → Clear auth_token cookie
   → Response success
```

---

## Troubleshooting

### 401 on login successful

**Issue:** Token set in cookie but not readable

**Check:**
- Is cookieParser() middleware added before routes?
- Is secure cookie flag correct for environment?
- Is httpOnly set to true?

### Password verification failing

**Issue:** Bcrypt comparison returns false

**Check:**
- Is password hashed with crypto.hashPassword() before storage?
- Is password hash using correct algorithm (bcrypt 12 rounds)?
- Is comparePassword() being called correctly?

### Email already registered false positive

**Issue:** New email marked as already registered

**Check:**
- Is emailExists() doing case-insensitive check?
- Are there duplicate records in database?
- Is email being lowercased consistently?

### Cookie not persisting

**Issue:** Cookie cleared or not sent by client

**Check:**
- Is sameSite set correctly?
- Is secure flag correct for environment?
- Is httpOnly set to true?
- Does client support cross-origin cookies?

---

## Next Steps

1. **Add password reset endpoint**
   - Generate reset token
   - Email reset link
   - Validate token and set new password

2. **Add email verification**
   - Send verification email on registration
   - Only allow login after verified

3. **Add rate limiting**
   - Limit login attempts
   - Limit registration attempts
   - Prevent brute force attacks

4. **Add user management endpoints**
   - List all users (admin)
   - Update user role (admin)
   - Delete user (admin)

5. **Add audit logging**
   - Log all authentication events
   - Track failed login attempts
   - Monitor user creation/deletion

---

**Reference:** [AUTH_SERVICE.md](AUTH_SERVICE.md) | [AUTH_SERVICE_QUICK_REF.md](AUTH_SERVICE_QUICK_REF.md)
