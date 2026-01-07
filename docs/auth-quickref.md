# Authentication Quick Reference

## For Developers

### Common Tasks

#### 1. Making an Authenticated API Call

```typescript
import { api } from './services/api';

// The api service handles tokens automatically
const profile = await api.user.get();
const inventory = await api.inventory.getAll();
```

#### 2. Checking Auth Status in a Component

```typescript
import { AuthSession } from './types';

const MyComponent = ({ authSession }: { authSession: AuthSession }) => {
  if (authSession.mode === 'signed-in') {
    // User is authenticated
    console.log('User ID:', authSession.userId);
    console.log('Email:', authSession.email);
  } else {
    // Guest mode
    console.log('User is in guest mode');
  }
};
```

#### 3. Implementing Sign Up

```typescript
import { api } from './services/api';

const handleSignUp = async (email: string, password: string, name?: string) => {
  try {
    const result = await api.auth.signup({ email, password, name });
    
    // Update app state with new session
    setAuthSession({
      mode: 'signed-in',
      userId: result.user.id,
      email: result.user.email,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    console.error('Sign up failed:', error);
  }
};
```

#### 4. Implementing Login

```typescript
import { api } from './services/api';

const handleLogin = async (email: string, password: string) => {
  try {
    const result = await api.auth.login({ email, password });
    
    // Update app state with session
    setAuthSession({
      mode: 'signed-in',
      userId: result.user.id,
      email: result.user.email,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

#### 5. Implementing Logout

```typescript
import { api } from './services/api';

const handleLogout = async () => {
  try {
    await api.auth.logout(); // Revokes refresh token
  } finally {
    setAuthSession({ mode: 'guest' }); // Clear session
  }
};
```

#### 6. OAuth Sign-In (Google)

```typescript
import { api } from './services/api';
import { googleSignIn } from './services/oauth';

const handleGoogleSignIn = async () => {
  try {
    const { idToken } = await googleSignIn(); // Gets ID token from Google SDK
    const result = await api.auth.oauthGoogle({ idToken });
    
    setAuthSession({
      mode: 'signed-in',
      userId: result.user.id,
      email: result.user.email,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    console.error('Google sign-in failed:', error);
  }
};
```

#### 7. Email Verification

```typescript
import { api } from './services/api';

// Request verification email
const requestVerification = async () => {
  try {
    const result = await api.auth.requestEmailVerification();
    console.log(result.message);
  } catch (error) {
    console.error('Failed to send verification:', error);
  }
};

// Verify with token (from email link)
const verifyEmail = async (token: string) => {
  try {
    const result = await api.auth.verifyEmail(token);
    console.log('Email verified!');
  } catch (error) {
    console.error('Verification failed:', error);
  }
};

// Check verification status
const checkStatus = async () => {
  try {
    const status = await api.auth.getVerificationStatus();
    console.log('Verified:', status.emailVerified);
  } catch (error) {
    console.error('Failed to check status:', error);
  }
};
```

### Backend Development

#### Creating a Protected Route

```typescript
import { Router } from 'express';
import { requireAuth } from '../auth/middleware';

const router = Router();

// Protected endpoint - requires authentication
router.get('/protected', requireAuth, async (req, res) => {
  const userId = req.user?.id; // User ID from JWT
  
  // Your logic here
  res.json({ userId, message: 'You are authenticated!' });
});

export default router;
```

#### Accessing User ID in Route Handler

```typescript
router.get('/my-data', requireAuth, async (req, res) => {
  const userId = req.user?.id; // Always available when using requireAuth
  
  const data = await query('SELECT * FROM my_table WHERE user_id = $1', [userId]);
  res.json(data.rows);
});
```

### Environment Variables

#### Backend

```env
# Required
JWT_SECRET=generate_a_random_32_char_secret_here
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=kitchenwiz

# Optional OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
MICROSOFT_CLIENT_ID=xxx
```

Generate JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Frontend

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_GEMINI_API_KEY=your_key_here
```

### Common Errors & Solutions

#### "Missing required env var: JWT_SECRET"
**Solution**: Add `JWT_SECRET` to `backend/.env`

#### "Invalid credentials" on login
**Solution**: 
- Check email is correct
- Verify password is correct
- Ensure user exists (try signing up first)

#### "HTTP 401" errors
**Solution**: 
- Access token expired (should auto-refresh)
- Invalid token (sign in again)
- No token provided (check Authorization header)

#### OAuth "Invalid idToken"
**Solution**:
- Verify OAuth client ID matches your app
- Check token hasn't expired
- Ensure backend env vars are set correctly

### Testing Auth Flows

#### Manual API Testing

```bash
# Sign Up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Use Access Token
curl http://localhost:3000/api/user \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"

# Refresh Token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN_HERE"}'
```

### Security Best Practices

✅ **DO:**
- Use strong JWT_SECRET (min 32 chars)
- Use HTTPS in production
- Never commit .env files
- Validate all user inputs
- Use proper CORS configuration
- Hash passwords with bcrypt
- Implement rate limiting

❌ **DON'T:**
- Store passwords in plain text
- Share JWT_SECRET publicly
- Use weak passwords
- Skip input validation
- Expose sensitive data in errors
- Store tokens in localStorage (use secure storage)

### Token Lifetimes

| Token Type | Default TTL | Configurable Via |
|------------|-------------|------------------|
| Access Token | 15 minutes | `ACCESS_TOKEN_TTL_SECONDS` |
| Refresh Token | 30 days | `REFRESH_TOKEN_TTL_SECONDS` |
| Verification Token | 24 hours | Hardcoded in route |

### Database Queries

#### Find User by Email
```typescript
const result = await query('SELECT * FROM users WHERE email = $1', [email]);
const user = result.rows[0];
```

#### Check if Email is Verified
```typescript
const result = await query('SELECT email_verified FROM users WHERE id = $1', [userId]);
const isVerified = result.rows[0]?.email_verified || false;
```

#### Revoke All User Sessions
```typescript
await query(
  'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
  [userId]
);
```

### TypeScript Types

```typescript
// Auth Session
interface AuthSession {
  mode: 'guest' | 'signed-in';
  userId?: string;
  email?: string | null;
  accessToken?: string;
  refreshToken?: string;
}

// Token Pair Response
interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
  refreshTokenExpiresInSeconds: number;
}

// User from Database
interface User {
  id: string;
  email: string | null;
  email_verified: boolean;
  name: string;
  created_at: Date;
  updated_at: Date;
}
```

### Debugging Tips

1. **Enable request logging**:
   ```typescript
   // In server.ts
   app.use((req, res, next) => {
     console.log(`${req.method} ${req.path}`, req.body);
     next();
   });
   ```

2. **Check token contents**:
   ```typescript
   import { jwtVerify } from 'jose';
   
   const payload = await jwtVerify(token, secretKey);
   console.log(payload);
   ```

3. **Verify database connection**:
   ```bash
   psql -U postgres -d kitchenwiz -c "SELECT COUNT(*) FROM users;"
   ```

### Resources

- [Full Documentation](../docs/auth-complete.md)
- [Setup Guide](../docs/auth-setup.md)
- [Database Schema](../database/schema.sql)
- [API Service](../src/services/api.ts)
- [Auth Routes](../backend/src/routes/auth.ts)
