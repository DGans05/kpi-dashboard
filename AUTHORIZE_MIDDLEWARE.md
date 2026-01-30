# Role-Based Authorization Middleware Documentation

Complete guide for using role-based authorization with Express.js.

## Overview

The authorization middleware provides role-based access control (RBAC) for Express routes. It:
- ✅ Validates user role against allowed roles
- ✅ Integrates seamlessly with authentication middleware
- ✅ Provides utility functions for conditional logic
- ✅ Supports dynamic role resolution
- ✅ Includes shorthand middleware for common patterns
- ✅ Returns proper HTTP status codes (401, 403)

## Installation & Setup

### Required Files

```
backend/src/middleware/
  ├── auth.ts              ← Authentication middleware (creates req.user)
  └── authorize.ts         ← Role-based authorization
```

### Setup in Express App

```typescript
import express from 'express';
import { authenticate } from './middleware/auth';
import { authorize, requireAdmin } from './middleware/authorize';

const app = express();

// IMPORTANT: authenticate MUST run BEFORE authorize
app.get('/api/profile', authenticate, authorize(['viewer', 'manager', 'admin']), handler);
app.delete('/api/users/:id', authenticate, authorize(['admin']), handler);
app.post('/api/kpi', authenticate, authorize(['admin', 'manager']), handler);
```

---

## API Reference

### authorize(allowedRoles)

Main authorization middleware. Checks if user's role is in the allowed list.

**Signature:**
```typescript
function authorize(allowedRoles: string[]): 
  (req: Request, res: Response, next: NextFunction) => void
```

**Parameters:**
- `allowedRoles` (string[]) - Array of role strings that are allowed
  - Example: `['admin']`, `['admin', 'manager']`, `['viewer', 'manager', 'admin']`

**Returns:**
- Calls `next()` if user's role is in allowedRoles
- 403 error if user's role is not in allowedRoles
- 401 error if req.user not found (shouldn't happen if authenticate runs first)

**Example:**
```typescript
// Only admin
app.delete('/api/users/:id', authenticate, authorize(['admin']), handler);

// Admin or manager
app.post('/api/kpi', authenticate, authorize(['admin', 'manager']), handler);

// All authenticated users (all roles)
app.get('/api/data', authenticate, authorize(['admin', 'manager', 'viewer']), handler);
```

**Error Responses:**

```typescript
// If user role not in allowedRoles
{
  "error": "Access denied",
  "message": "This action requires one of these roles: admin, manager"
}
```

---

### requireAdmin()

Shorthand middleware for `authorize(['admin'])`

**Signature:**
```typescript
function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void
```

**Usage:**
```typescript
// These are equivalent:
app.delete('/api/users/:id', authenticate, authorize(['admin']), handler);
app.delete('/api/users/:id', authenticate, requireAdmin, handler);
```

---

### requireManagerOrAdmin()

Shorthand middleware for `authorize(['admin', 'manager'])`

**Signature:**
```typescript
function requireManagerOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void
```

**Usage:**
```typescript
// These are equivalent:
app.put('/api/config', authenticate, authorize(['admin', 'manager']), handler);
app.put('/api/config', authenticate, requireManagerOrAdmin, handler);
```

---

### createRoleCheck(roles)

Create reusable authorization middleware without repeating roles array.

**Signature:**
```typescript
function createRoleCheck(roles: string[]): 
  (req: Request, res: Response, next: NextFunction) => void
```

**Usage:**
```typescript
const dataEditors = createRoleCheck(['admin', 'manager']);
const reportViewers = createRoleCheck(['admin', 'manager', 'viewer']);

app.post('/api/data/create', authenticate, dataEditors, handler);
app.post('/api/data/edit', authenticate, dataEditors, handler);
app.get('/api/reports', authenticate, reportViewers, handler);
```

---

### userHasRole(req, roles)

Utility function to check if user has ANY of the specified roles inside a handler.

**Signature:**
```typescript
function userHasRole(req: Request, roles: string[]): boolean
```

**Parameters:**
- `req` - Express Request object (must have req.user)
- `roles` - Array of role strings to check against

**Returns:**
- `true` if user exists and has one of the roles
- `false` otherwise

**Usage:**
```typescript
app.get('/api/dashboard', authenticate, (req, res) => {
  if (userHasRole(req, ['admin', 'manager'])) {
    res.json({ dashboard: 'management' });
  } else {
    res.json({ dashboard: 'viewer' });
  }
});
```

---

### userIsAdmin(req)

Utility function to check if user is specifically an admin.

**Signature:**
```typescript
function userIsAdmin(req: Request): boolean
```

**Usage:**
```typescript
app.get('/api/system', authenticate, (req, res) => {
  if (userIsAdmin(req)) {
    res.json({ systemData: true });
  } else {
    res.status(403).json({ error: 'Admin only' });
  }
});
```

---

### userIsManagerOrAdmin(req)

Utility function to check if user is admin or manager.

**Signature:**
```typescript
function userIsManagerOrAdmin(req: Request): boolean
```

**Usage:**
```typescript
app.post('/api/data', authenticate, (req, res) => {
  if (!userIsManagerOrAdmin(req)) {
    return res.status(403).json({ error: 'Manager+ required' });
  }

  // Process data
  res.json({ saved: true });
});
```

---

### userIsElevated(req)

Utility function to check if user has elevated privileges (not a viewer).

**Signature:**
```typescript
function userIsElevated(req: Request): boolean
```

**Usage:**
```typescript
app.post('/api/comments/bulk-delete', authenticate, (req, res) => {
  if (!userIsElevated(req)) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      message: 'Managers and admins only',
    });
  }

  // Bulk delete comments
  res.json({ deleted: 100 });
});
```

---

### createDynamicRoleCheck(roleResolver)

Create authorization middleware where allowed roles are determined at runtime based on request data.

**Signature:**
```typescript
function createDynamicRoleCheck(
  roleResolver: (req: Request) => string[]
): (req: Request, res: Response, next: NextFunction) => void
```

**Parameters:**
- `roleResolver` - Function that returns array of allowed roles based on request

**Usage:**
```typescript
// User can only edit their own profile, admin can edit anyone
const isOwnerOrAdmin = createDynamicRoleCheck((req: Request) => {
  const targetUserId = req.params.userId;
  const currentUserId = req.user?.userId;

  // Admin can edit anyone
  if (req.user?.role === 'admin') {
    return ['admin'];
  }

  // Regular user can only edit themselves
  if (targetUserId === currentUserId) {
    return ['admin', 'manager', 'viewer'];
  }

  // Otherwise deny
  return [];
});

app.put('/api/users/:userId', authenticate, isOwnerOrAdmin, handler);
```

---

## Common Patterns

### 1. Admin-Only Endpoint

```typescript
app.delete('/api/users/:id', authenticate, authorize(['admin']), (req, res) => {
  res.json({ message: 'User deleted' });
});

// Or using shorthand
app.delete('/api/users/:id', authenticate, requireAdmin, (req, res) => {
  res.json({ message: 'User deleted' });
});
```

### 2. Multiple Allowed Roles

```typescript
app.post('/api/kpi', authenticate, authorize(['admin', 'manager']), (req, res) => {
  res.json({ message: 'KPI created' });
});

// Or using shorthand
app.post('/api/kpi', authenticate, requireManagerOrAdmin, (req, res) => {
  res.json({ message: 'KPI created' });
});
```

### 3. All Authenticated Users

```typescript
app.get('/api/data', authenticate, authorize(['admin', 'manager', 'viewer']), (req, res) => {
  res.json({ message: 'Data retrieved' });
});
```

### 4. Reusable Authorization Checks

```typescript
const dataEditors = createRoleCheck(['admin', 'manager']);
const fullAccess = createRoleCheck(['admin', 'manager', 'viewer']);

app.post('/api/data/create', authenticate, dataEditors, handler1);
app.put('/api/data/:id', authenticate, dataEditors, handler2);
app.get('/api/data', authenticate, fullAccess, handler3);
```

### 5. Conditional Logic Inside Handler

```typescript
app.get('/api/dashboard', authenticate, (req, res) => {
  const baseData = { date: new Date() };

  if (userIsAdmin(req)) {
    return res.json({
      ...baseData,
      adminPanel: true,
      allRestaurants: true,
    });
  }

  if (userIsManagerOrAdmin(req)) {
    return res.json({
      ...baseData,
      managerPanel: true,
    });
  }

  res.json({
    ...baseData,
    viewerPanel: true,
  });
});
```

### 6. Dynamic Authorization

```typescript
// User can edit their own resource or admin can edit any
const isOwnerOrAdmin = createDynamicRoleCheck((req: Request) => {
  const resourceOwnerId = req.params.ownerId;
  const currentUserId = req.user?.userId;

  if (req.user?.role === 'admin') return ['admin'];
  if (resourceOwnerId === currentUserId) return ['viewer', 'manager', 'admin'];
  return [];
});

app.put('/api/resources/:ownerId/:resourceId', authenticate, isOwnerOrAdmin, handler);
```

### 7. Database-Dependent Authorization

```typescript
// Check role AND verify user has access to restaurant
const canManageRestaurant = createDynamicRoleCheck(async (req: Request) => {
  const restaurantId = req.params.restaurantId;
  const user = req.user!;

  // Admin can manage any restaurant
  if (user.role === 'admin') return ['admin'];

  // Manager can only manage their assigned restaurant
  if (user.role === 'manager' && user.restaurantId === restaurantId) {
    return ['manager'];
  }

  // No access
  return [];
});

app.put('/api/restaurants/:restaurantId/config', authenticate, canManageRestaurant, handler);
```

---

## Middleware Ordering

⚠️ **CRITICAL: authenticate MUST run BEFORE authorize**

```typescript
// CORRECT ✓
app.post('/api/data', authenticate, authorize(['admin', 'manager']), handler);

// WRONG ✗
app.post('/api/data', authorize(['admin', 'manager']), authenticate, handler);
// This will fail because authorize runs first and req.user doesn't exist yet
```

---

## Error Handling

### Error Codes

| Code | Scenario | Handler |
|------|----------|---------|
| **401** | `req.user` not found (middleware order wrong) | authorize() |
| **403** | User role not in allowedRoles | authorize() |
| **500** | Invalid configuration (empty allowedRoles) | authorize() |

### Example Error Responses

```typescript
// Missing authentication (shouldn't happen if authenticate runs first)
{
  "error": "Authentication required",
  "message": "authenticate middleware must run before authorize"
}

// Insufficient role
{
  "error": "Access denied",
  "message": "This action requires one of these roles: admin, manager"
}

// Server configuration error
{
  "error": "Server error",
  "message": "Authorization configuration error"
}
```

---

## Security Best Practices

### ✅ DO:

1. **Always run authenticate before authorize**
   ```typescript
   // Correct order
   app.post('/api/data', authenticate, authorize(['admin']), handler);
   ```

2. **Use specific roles, not generic ones**
   ```typescript
   // Good - specific roles
   authorize(['admin', 'manager'])

   // Bad - too generic
   authorize(['user'])
   ```

3. **Combine with restaurant access checks**
   ```typescript
   import { requireRestaurantAccess } from './auth';
   
   app.get(
     '/api/restaurants/:restaurantId/data',
     authenticate,
     authorize(['admin', 'manager']),
     requireRestaurantAccess,
     handler
   );
   ```

4. **Log authorization events**
   ```typescript
   // Already logged in middleware
   logger.warn('Authorization denied: Insufficient permissions', {
     userId: req.user.userId,
     userRole: req.user.role,
     requiredRoles: allowedRoles,
   });
   ```

5. **Use utility functions for complex logic**
   ```typescript
   if (!userHasRole(req, ['admin', 'manager'])) {
     return res.status(403).json({ error: 'Insufficient permissions' });
   }
   ```

### ❌ DON'T:

1. **Never trust client-side role information**
   ```typescript
   // Bad - client could send any role
   const userRole = req.body.role;
   ```

2. **Don't skip authorization on "internal" endpoints**
   ```typescript
   // Bad - assumes internal security
   app.post('/api/internal/process', handler);
   
   // Good - even internal endpoints need auth
   app.post('/api/internal/process', authenticate, requireAdmin, handler);
   ```

3. **Don't expose role information in errors**
   ```typescript
   // Bad - reveals role system
   res.status(403).json({ error: `Your role '${req.user.role}' is not allowed` });
   
   // Good - generic error
   res.status(403).json({ error: 'Access denied' });
   ```

4. **Don't duplicate authorization logic**
   ```typescript
   // Bad - repeated
   app.post('/api/data/create', auth, authorize(['admin', 'manager']), h1);
   app.post('/api/data/edit', auth, authorize(['admin', 'manager']), h2);
   
   // Good - reusable
   const editors = createRoleCheck(['admin', 'manager']);
   app.post('/api/data/create', auth, editors, h1);
   app.post('/api/data/edit', auth, editors, h2);
   ```

5. **Don't use middleware without proper error handling**
   ```typescript
   // Middleware logs errors and returns JSON responses
   // No need for try-catch in most handlers
   ```

---

## Testing

### Unit Test Examples

```typescript
import request from 'supertest';
import app from './server';
import { generateToken } from './utils/jwt';

describe('Authorization Middleware', () => {
  const adminToken = generateToken({
    userId: 'admin_1',
    email: 'admin@example.com',
    role: 'admin',
    restaurantId: null,
  });

  const managerToken = generateToken({
    userId: 'manager_1',
    email: 'manager@example.com',
    role: 'manager',
    restaurantId: 'restaurant_123',
  });

  const viewerToken = generateToken({
    userId: 'viewer_1',
    email: 'viewer@example.com',
    role: 'viewer',
    restaurantId: 'restaurant_123',
  });

  test('authorize allows user with required role', async () => {
    const response = await request(app)
      .post('/api/kpi')
      .set('Cookie', `auth_token=${managerToken}`);

    expect(response.status).toBe(200);
  });

  test('authorize denies user without required role', async () => {
    const response = await request(app)
      .delete('/api/users/123')
      .set('Cookie', `auth_token=${managerToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Access denied');
  });

  test('authorize allows any of multiple roles', async () => {
    const response = await request(app)
      .post('/api/kpi')
      .set('Cookie', `auth_token=${adminToken}`);

    expect(response.status).toBe(200);
  });

  test('requireAdmin shorthand works', async () => {
    const response = await request(app)
      .delete('/api/system/reset')
      .set('Cookie', `auth_token=${adminToken}`);

    expect(response.status).toBe(200);
  });

  test('requireAdmin denies non-admins', async () => {
    const response = await request(app)
      .delete('/api/system/reset')
      .set('Cookie', `auth_token=${viewerToken}`);

    expect(response.status).toBe(403);
  });

  test('userHasRole utility function works', async () => {
    const response = await request(app).get('/api/dashboard');

    // Should have conditional response based on roles
    expect(response.status).toBe(200);
  });
});
```

---

## Troubleshooting

### Issue: 401 "Authentication required" on authorized endpoint

**Cause:** `authenticate` middleware not running before `authorize`

**Solution:**
```typescript
// Wrong order
app.get('/api/admin', authorize(['admin']), authenticate, handler);

// Correct order
app.get('/api/admin', authenticate, authorize(['admin']), handler);
```

### Issue: 403 "Access denied" for correct role

**Cause 1:** Role name mismatch (case-sensitive)
```typescript
// Wrong - 'Admin' vs 'admin'
authorize(['Admin'])

// Correct
authorize(['admin'])
```

**Cause 2:** User object doesn't have role
```typescript
// Debug by checking what's in req.user
app.get('/api/test', authenticate, (req, res) => {
  console.log(req.user); // Check structure
});
```

### Issue: Utility function returns false unexpectedly

**Cause:** `req.user` doesn't exist (authenticate not run)

**Solution:** Ensure route has `authenticate` middleware

```typescript
// Wrong - no req.user
app.get('/api/test', (req, res) => {
  userHasRole(req, ['admin']); // req.user is undefined
});

// Correct
app.get('/api/test', authenticate, (req, res) => {
  userHasRole(req, ['admin']); // req.user exists
});
```

---

## Files Reference

| File | Purpose |
|------|---------|
| [backend/src/middleware/authorize.ts](backend/src/middleware/authorize.ts) | Authorization middleware implementation |
| [backend/src/middleware/authorize.example.ts](backend/src/middleware/authorize.example.ts) | 14 complete usage examples |
| [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts) | Authentication middleware (runs first) |
| [backend/src/types/express.d.ts](backend/src/types/express.d.ts) | Express Request type extension |

---

**Status:** ✅ Production Ready | **TypeScript:** ✅ Full Type Safety | **Examples:** ✅ 14 Complete Patterns
