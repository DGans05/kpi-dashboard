# Password Hashing Utilities Documentation

Complete guide for the bcrypt-based password hashing utilities in `backend/src/utils/crypto.ts`.

## Overview

The crypto utilities provide secure password hashing and verification using bcrypt with 12 salt rounds. These utilities are essential for user authentication, registration, and password reset functionality.

**Features:**
- ✅ Bcrypt hashing with 12 salt rounds (industry standard)
- ✅ Password strength validation
- ✅ Comprehensive error handling
- ✅ Full TypeScript type safety
- ✅ Input validation and sanitization
- ✅ Structured logging for debugging

## Installation

Bcrypt is already installed as a dependency:

```bash
npm install bcrypt
npm install --save-dev @types/bcrypt
```

## API Reference

### hashPassword()

Hashes a plain text password using bcrypt with 12 salt rounds.

**Signature:**
```typescript
function hashPassword(password: string): Promise<string>
```

**Parameters:**
- `password` (string) - Plain text password to hash
  - Must be 8-128 characters
  - Required, non-empty
  - No special length restrictions beyond these limits

**Returns:**
- Promise<string> - Bcrypt hash (60 characters, starts with `$2b$12$`)

**Throws:**
- Error if password is invalid
- Error if hashing fails

**Example:**
```typescript
import { hashPassword } from './utils/crypto';

// Basic usage
const password = 'MySecurePassword123!';
const hash = await hashPassword(password);
// Result: $2b$12$...60-character hash...

// Each call produces a different hash (different salt)
const hash2 = await hashPassword(password);
console.log(hash === hash2); // false - but both verify with same password
```

**Validation Rules:**
- ✗ `null` or `undefined` - throws error
- ✗ Empty string `""` - throws error
- ✗ Less than 8 characters - throws error
- ✗ More than 128 characters - throws error
- ✓ 8-128 characters - accepted

**Performance:**
- 12 salt rounds ≈ 50-100ms per hash on modern hardware
- Use `hashPassword()` only during registration/password reset (not on every request)

---

### comparePassword()

Compares a plain text password with a bcrypt hash. This is the safe, timing-attack resistant way to verify passwords.

**Signature:**
```typescript
function comparePassword(password: string, hash: string): Promise<boolean>
```

**Parameters:**
- `password` (string) - Plain text password to verify
  - Must match the original password that was hashed
- `hash` (string) - Bcrypt hash to compare against
  - Must be a valid bcrypt hash (60 chars, starts with `$2b$`, `$2a$`, or `$2y$`)

**Returns:**
- Promise<boolean> - true if passwords match, false if they don't

**Throws:**
- Error if inputs are invalid
- Error if hash format is invalid
- Does NOT throw if passwords don't match (returns false)

**Example:**
```typescript
import { comparePassword } from './utils/crypto';

const password = 'MySecurePassword123!';
const hash = '$2b$12$...'; // Hash from hashPassword()

// Correct password
const isMatch = await comparePassword(password, hash);
console.log(isMatch); // true

// Wrong password
const isWrong = await comparePassword('WrongPassword', hash);
console.log(isWrong); // false

// Case-sensitive
const isCaseSensitive = await comparePassword('mysecurepassword123!', hash);
console.log(isCaseSensitive); // false
```

**Validation Rules:**
- ✗ Empty password or hash - throws error
- ✗ Invalid bcrypt hash format - throws error
- ✓ Valid hash and matching password - returns true
- ✓ Valid hash and non-matching password - returns false
- ✓ Works with any bcrypt hash version ($2a$, $2b$, $2y$)

**Security Notes:**
- Uses timing-attack resistant comparison
- Never reveals whether the hash is invalid vs password mismatch
- Returns false for non-matching passwords (never throws)
- Logs failures for security monitoring

---

### validatePasswordStrength()

Validates password strength based on length and complexity requirements.

**Signature:**
```typescript
function validatePasswordStrength(password: string): {
  isValid: boolean;
  message: string;
  strength: 'weak' | 'medium' | 'strong';
}
```

**Parameters:**
- `password` (string) - Password to validate

**Returns:**
- `isValid` (boolean) - Whether password meets minimum requirements
- `message` (string) - Descriptive message about validity or strength
- `strength` ('weak' | 'medium' | 'strong') - Estimated password strength

**Example:**
```typescript
import { validatePasswordStrength } from './utils/crypto';

// Weak password
const weak = validatePasswordStrength('password');
console.log(weak);
// { isValid: false, message: 'Password must be at least 8 characters long', strength: 'weak' }

// Medium strength
const medium = validatePasswordStrength('Password123');
console.log(medium);
// { isValid: true, message: 'Password strength: medium', strength: 'medium' }

// Strong password
const strong = validatePasswordStrength('MySecurePassword123!');
console.log(strong);
// { isValid: true, message: 'Password strength: strong', strength: 'strong' }
```

**Strength Calculation:**

| Criteria | Required |
|----------|----------|
| Minimum length | 8 characters |
| Maximum length | 128 characters |
| Uppercase letter | For medium/strong |
| Lowercase letter | For medium/strong |
| Number | For medium/strong |
| Special character | For strong |

**Strength Levels:**

| Strength | Requirements |
|----------|--------------|
| **Weak** | Less than 8 chars, or too long (>128) |
| **Medium** | 8-11 chars, 2+ complexity types, or 10+ chars with 2+ types |
| **Strong** | 12+ chars, 3+ complexity types |

---

## Common Patterns

### User Registration

```typescript
import {
  hashPassword,
  validatePasswordStrength,
} from './utils/crypto';

async function registerUser(email: string, password: string) {
  // 1. Validate password strength
  const validation = validatePasswordStrength(password);
  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  // 2. Check email availability
  const existingUser = await db.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  if (existingUser.rows.length > 0) {
    throw new Error('Email already registered');
  }

  // 3. Hash password
  const passwordHash = await hashPassword(password);

  // 4. Save to database
  const result = await db.query(
    'INSERT INTO users (email, password_hash, created_at) VALUES ($1, $2, $3) RETURNING id',
    [email, passwordHash, new Date()]
  );

  return { userId: result.rows[0].id };
}
```

### User Login

```typescript
import { comparePassword } from './utils/crypto';
import { generateToken } from './jwt';

async function loginUser(email: string, password: string) {
  // 1. Find user by email
  const user = await db.query('SELECT id, password_hash FROM users WHERE email = $1', [
    email,
  ]);

  if (user.rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const dbUser = user.rows[0];

  // 2. Verify password
  const isMatch = await comparePassword(password, dbUser.password_hash);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  // 3. Generate JWT token
  const token = generateToken({
    userId: dbUser.id,
    email: email,
  });

  return { token, userId: dbUser.id };
}
```

### Password Reset

```typescript
async function resetPassword(
  userId: string,
  oldPassword: string,
  newPassword: string
) {
  // 1. Get current password hash
  const user = await db.query('SELECT password_hash FROM users WHERE id = $1', [
    userId,
  ]);

  if (user.rows.length === 0) {
    throw new Error('User not found');
  }

  // 2. Verify old password
  const oldMatch = await comparePassword(oldPassword, user.rows[0].password_hash);
  if (!oldMatch) {
    throw new Error('Current password is incorrect');
  }

  // 3. Validate new password
  const validation = validatePasswordStrength(newPassword);
  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  // 4. Ensure new password is different
  const newMatch = await comparePassword(newPassword, user.rows[0].password_hash);
  if (newMatch) {
    throw new Error('New password must be different from current password');
  }

  // 5. Hash and save new password
  const newHash = await hashPassword(newPassword);
  await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
    newHash,
    userId,
  ]);
}
```

## Express.js Integration

### Registration Endpoint

```typescript
import express from 'express';
import { hashPassword, validatePasswordStrength } from './utils/crypto';

const app = express();
app.use(express.json());

interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, confirmPassword }: RegisterRequest = req.body;

    // Validate inputs
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({
        error: 'Email, password, and confirmPassword are required',
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
    if (password !== confirmPassword) {
      return res.status(400).json({
        error: 'Passwords do not match',
      });
    }

    // Validate password strength
    const validation = validatePasswordStrength(password);
    if (!validation.isValid) {
      return res.status(400).json({
        error: validation.message,
      });
    }

    // Check if user exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [
      email,
    ]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'User already exists',
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Save user
    const result = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email, passwordHash]
    );

    res.status(201).json({
      message: 'User registered successfully',
      userId: result.rows[0].id,
    });
  } catch (error) {
    logger.error('Registration error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Registration failed',
    });
  }
});
```

### Login Endpoint

```typescript
import { comparePassword } from './utils/crypto';
import { generateToken } from './utils/jwt';

interface LoginRequest {
  email: string;
  password: string;
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    // Get user from database
    const user = await db.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    const dbUser = user.rows[0];

    // Compare password
    const passwordMatch = await comparePassword(password, dbUser.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: dbUser.id,
      email: dbUser.email,
    });

    logger.info('User login successful', {
      userId: dbUser.id,
      email: dbUser.email,
    });

    res.json({
      message: 'Login successful',
      token,
      userId: dbUser.id,
    });
  } catch (error) {
    logger.error('Login error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Login failed',
    });
  }
});
```

## Security Best Practices

### ✅ DO:

1. **Always hash passwords before storing**
   ```typescript
   // Good ✓
   const hash = await hashPassword(password);
   await db.query('INSERT INTO users (password_hash) VALUES ($1)', [hash]);
   ```

2. **Always use comparePassword for verification**
   ```typescript
   // Good ✓
   const isMatch = await comparePassword(inputPassword, storedHash);
   ```

3. **Validate password strength on registration**
   ```typescript
   // Good ✓
   const validation = validatePasswordStrength(password);
   if (!validation.isValid) {
     return res.status(400).json({ error: validation.message });
   }
   ```

4. **Use HTTPS for all authentication endpoints**
   - Prevents password interception

5. **Rate limit authentication endpoints**
   - Prevent brute force attacks

6. **Log authentication failures for monitoring**
   ```typescript
   logger.warn('Login attempt failed', { email, reason: 'invalid password' });
   ```

### ❌ DON'T:

1. **Never store plain text passwords**
   ```typescript
   // Bad ✗
   await db.query('INSERT INTO users (password) VALUES ($1)', [password]);
   ```

2. **Never compare passwords with ===**
   ```typescript
   // Bad ✗
   if (password === storedPassword) { ... }
   ```

3. **Never use MD5 or SHA hashes for passwords**
   ```typescript
   // Bad ✗
   const hash = crypto.createHash('md5').update(password).digest('hex');
   ```

4. **Never send password in response**
   ```typescript
   // Bad ✗
   res.json({ password: user.password });
   ```

5. **Never use short salt rounds**
   ```typescript
   // Bad ✗
   await bcrypt.hash(password, 4); // Only 4 rounds
   ```

## Error Handling

### Error Types

All functions throw `Error` with descriptive messages:

```typescript
try {
  await hashPassword('short'); // Less than 8 chars
} catch (error) {
  // Error: Password hashing failed: Password must be at least 8 characters long
  console.error(error.message);
}

try {
  await comparePassword('password', 'invalideash');
} catch (error) {
  // Error: Password comparison failed: Invalid bcrypt hash format
  console.error(error.message);
}
```

### Logging

All operations are logged:

```typescript
// Successful hash
// [DEBUG] Hashing password { length: 20 }
// [DEBUG] Password hashed successfully

// Successful comparison
// [DEBUG] Comparing password with hash
// [DEBUG] Password comparison successful: passwords match

// Failed operations
// [ERROR] Failed to hash password { error: 'Password must be at least 8 characters long' }
// [ERROR] Failed to compare password { error: 'Invalid bcrypt hash format' }
```

## Performance Considerations

### Hashing Performance

- **12 salt rounds**: 50-100ms per hash (industry standard)
- **Only hash during**: Registration, password reset, password change
- **Never hash on**: Every login check, every request validation

### Optimization Tips

1. **Use queue for mass operations**
   ```typescript
   // If resetting many passwords
   const queue = new Queue();
   users.forEach(user => {
     queue.add(() => hashPassword(user.password));
   });
   ```

2. **Cache hash in transaction**
   ```typescript
   const hash = await hashPassword(password);
   await db.withTransaction(async (client) => {
     await client.query('INSERT INTO users ...', [hash]);
     // No re-hashing
   });
   ```

3. **Consider async workers**
   - Hash in background for bulk operations
   - Keep main thread responsive

## Testing

### Unit Tests

```typescript
import { hashPassword, comparePassword, validatePasswordStrength } from './crypto';

describe('crypto utilities', () => {
  test('hashPassword creates valid bcrypt hash', async () => {
    const hash = await hashPassword('TestPassword123!');
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(hash.length).toBe(60);
  });

  test('comparePassword returns true for matching password', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);
    const result = await comparePassword(password, hash);
    expect(result).toBe(true);
  });

  test('comparePassword returns false for non-matching password', async () => {
    const hash = await hashPassword('TestPassword123!');
    const result = await comparePassword('WrongPassword', hash);
    expect(result).toBe(false);
  });

  test('validatePasswordStrength identifies weak passwords', () => {
    const result = validatePasswordStrength('weak');
    expect(result.isValid).toBe(false);
    expect(result.strength).toBe('weak');
  });

  test('validatePasswordStrength identifies strong passwords', () => {
    const result = validatePasswordStrength('MySecurePassword123!');
    expect(result.isValid).toBe(true);
    expect(result.strength).toBe('strong');
  });
});
```

## Troubleshooting

### Issue: "password hashing failed: EACCES"
**Cause:** Permission denied writing to /tmp
**Solution:** Check disk space and file permissions

### Issue: "Invalid bcrypt hash format"
**Cause:** Hash was corrupted or modified
**Solution:** Re-hash password, ensure hash is stored intact in database

### Issue: "password comparison failed"
**Cause:** Hash retrieved from database incorrectly
**Solution:** Verify hash is stored as text/VARCHAR in database, not binary

### Issue: Hashing takes too long
**Cause:** Server under heavy load
**Solution:** Use background queue or increase timeout

## Related Files

- [JWT_UTILITIES.md](JWT_UTILITIES.md) - JWT token generation and verification
- [JWT_INTEGRATION.md](JWT_INTEGRATION.md) - Complete authentication flow
- [backend/src/config/env.ts](backend/src/config/env.ts) - Environment configuration
- [backend/src/utils/jwt.ts](backend/src/utils/jwt.ts) - JWT functions
