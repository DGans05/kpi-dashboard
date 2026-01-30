# Role-Based Authorization - Quick Reference

## TL;DR - Common Usage

```typescript
import { 
  authorize, 
  requireAdmin, 
  requireManagerOrAdmin,
  userHasRole 
} from './middleware/authorize';
import { authenticate } from './middleware/auth';

// Admin only
app.delete('/api/users/:id', authenticate, authorize(['admin']), handler);

// Or using shorthand
app.delete('/api/users/:id', authenticate, requireAdmin, handler);

// Manager or admin
app.post('/api/kpi', authenticate, authorize(['admin', 'manager']), handler);

// Conditional in handler
app.get('/api/dashboard', authenticate, (req, res) => {
  if (userHasRole(req, ['admin'])) {
    res.json({ adminData: true });
  } else {
    res.json({ regularData: true });
  }
});
```

---

## Functions at a Glance

| Function | Purpose | Example |
|----------|---------|---------|
| `authorize(['admin'])` | Middleware to check roles | `app.post('/api', auth, authorize(['admin']), h)` |
| `requireAdmin` | Shorthand for `['admin']` | `app.delete('/api', auth, requireAdmin, h)` |
| `requireManagerOrAdmin` | Shorthand for `['admin', 'manager']` | `app.put('/api', auth, requireManagerOrAdmin, h)` |
| `createRoleCheck(['a', 'b'])` | Create reusable middleware | `const edit = createRoleCheck(['admin', 'manager']);` |
| `userHasRole(req, ['admin'])` | Check role in handler | `if (userHasRole(req, ['admin']))` |
| `userIsAdmin(req)` | Check if admin | `if (userIsAdmin(req))` |
| `userIsManagerOrAdmin(req)` | Check if admin or manager | `if (userIsManagerOrAdmin(req))` |
| `userIsElevated(req)` | Check if not viewer | `if (userIsElevated(req))` |
| `createDynamicRoleCheck(fn)` | Dynamic roles based on request | `createDynamicRoleCheck(req => req.user.role === 'admin' ? ['admin'] : [])` |

---

## Setup Checklist

- [ ] `backend/src/middleware/authorize.ts` created
- [ ] `backend/src/middleware/auth.ts` exists (authentication)
- [ ] `backend/src/types/express.d.ts` extends Request with user
- [ ] Import `{ authenticate }` from auth.ts
- [ ] Import authorization functions from authorize.ts
- [ ] **ALWAYS** put `authenticate` BEFORE `authorize` in middleware chain
- [ ] Test authorization in route handler

---

## Error Codes

| Code | When | Example |
|------|------|---------|
| **401** | User not authenticated (wrong middleware order) | 401 - "Authentication required" |
| **403** | User role not allowed | 403 - "Access denied: requires admin, manager" |
| **500** | Server configuration error | 500 - "Authorization configuration error" |

---

## Key Points

✅ **DO:**
- Run `authenticate` BEFORE `authorize`
- Use specific role strings: `'admin'`, `'manager'`, `'viewer'`
- Combine with other middleware: `auth → authorize → restaurant access → handler`
- Use utility functions for conditional logic in handlers
- Create reusable role checks with `createRoleCheck()`

❌ **DON'T:**
- Use different role names (case-sensitive: `'Admin'` ≠ `'admin'`)
- Skip authenticate middleware
- Trust client-sent role data
- Use generic role names like `'user'` or `'superuser'`
- Expose detailed role info in error messages

---

## Test Template

```typescript
import request from 'supertest';
import app from './app';
import { generateToken } from './utils/jwt';

describe('Authorization', () => {
  const adminToken = generateToken({
    userId: '1',
    email: 'admin@test.com',
    role: 'admin',
    restaurantId: null,
  });

  test('admin can access admin route', async () => {
    const res = await request(app)
      .delete('/api/users/123')
      .set('Cookie', `auth_token=${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('non-admin gets 403', async () => {
    const viewerToken = generateToken({
      userId: '2',
      email: 'viewer@test.com',
      role: 'viewer',
      restaurantId: null,
    });
    const res = await request(app)
      .delete('/api/users/123')
      .set('Cookie', `auth_token=${viewerToken}`);
    expect(res.status).toBe(403);
  });
});
```

---

**Reference:** [AUTHORIZE_MIDDLEWARE.md](AUTHORIZE_MIDDLEWARE.md) | **Examples:** [authorize.example.ts](backend/src/middleware/authorize.example.ts)
