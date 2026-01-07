# KitchenWiz Authentication System

Complete authentication implementation with email/password, OAuth (Google/Microsoft), JWT tokens, and email verification.

## ✅ Completed Features

### 1. Email/Password Authentication
- **Sign Up**: Create account with email, password, and optional name
- **Login**: Authenticate with email and password
- **Password Security**: bcrypt hashing with 12 salt rounds
- **Validation**: Minimum 8 character password requirement
- **Error Handling**: Clear error messages for common issues

### 2. JWT Token Management
- **Access Tokens**: Short-lived (15 minutes), used for API authentication
- **Refresh Tokens**: Long-lived (30 days), used to obtain new access tokens
- **Token Rotation**: Refresh tokens are rotated on each use for security
- **Automatic Refresh**: Tokens auto-refresh on 401 errors and proactively before expiry
- **Secure Storage**: Refresh tokens stored hashed in database

### 3. OAuth Sign-In (Backend Ready)
- **Google Sign-In**: ID token verification via Google JWKS
- **Microsoft Sign-In**: ID token verification via Azure AD JWKS
- **Account Creation**: Automatic user creation on first OAuth sign-in
- **Duplicate Prevention**: Prevents duplicate accounts, requires explicit linking
- **Email Verification**: Tracks email verification status from OAuth providers

### 4. Logout
- **Token Revocation**: Refresh tokens revoked on logout
- **Local Cleanup**: All auth data cleared from app state
- **Multiple Sessions**: Each device/session tracked separately

### 5. Session Management
- **Persistent Sessions**: Auth state persists across app restarts
- **Guest Mode**: App usable without authentication (local data only)
- **Seamless Transition**: Easy switch between guest and authenticated modes

### 6. Email Verification (Optional)
- **Verification Tokens**: Secure token generation and validation
- **Status Tracking**: Check verification status via API
- **Token Expiry**: 24-hour expiration for security
- **Ready for Email Service**: Integration points for email sending (SendGrid, etc.)

## 🏗️ Architecture

### Backend Components

```
backend/src/
├── auth/
│   ├── middleware.ts       # JWT verification middleware
│   ├── password.ts         # Password hashing/verification
│   ├── tokens.ts          # JWT signing/verification, refresh token generation
│   ├── oauth.ts           # Google/Microsoft ID token verification
│   └── types.ts           # Auth type definitions
├── routes/
│   ├── auth.ts            # Auth endpoints (signup, login, OAuth, refresh, logout)
│   └── emailVerification.ts # Email verification endpoints
└── server.ts              # Express server setup
```

### Frontend Components

```
src/
├── screens/
│   ├── AuthScreen.tsx     # Sign in/sign up UI
│   └── ProfileScreen.tsx  # User profile & logout
├── services/
│   ├── api.ts             # API client with auto-refresh
│   ├── oauth.ts           # OAuth integration helpers
│   ├── storage.ts         # AsyncStorage wrapper
│   └── useAuthRefresh.ts  # Token refresh hook
└── types.ts               # Auth type definitions
```

### Database Schema

```sql
users                      # User accounts
user_passwords            # Password hashes (for email/password auth)
user_identities          # OAuth identities (Google, Microsoft)
refresh_tokens           # Active refresh tokens (hashed)
email_verification_tokens # Email verification tokens
```

## 🔐 Security Features

### Password Security
- ✅ bcrypt hashing (12 rounds)
- ✅ No plaintext storage
- ✅ Minimum length enforcement
- ⏳ Password strength requirements (add as needed)
- ⏳ Password reset flow (future enhancement)

### Token Security
- ✅ Access tokens expire in 15 minutes
- ✅ Refresh tokens expire in 30 days
- ✅ Refresh token rotation (prevents reuse)
- ✅ Refresh tokens stored hashed
- ✅ Token revocation on logout
- ✅ Device/IP tracking for sessions

### OAuth Security
- ✅ ID token verification via JWKS
- ✅ Issuer and audience validation
- ✅ Prevents account takeover (requires explicit linking)
- ✅ Email verification tracking

### API Security
- ✅ CORS enabled
- ✅ Bearer token authentication
- ✅ Protected endpoints require auth
- ⏳ Rate limiting (add as needed)
- ⏳ HTTPS in production (deployment requirement)

## 📝 API Endpoints

### Authentication

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/signup` | POST | None | Create new account with email/password |
| `/api/auth/login` | POST | None | Login with email/password |
| `/api/auth/oauth/google` | POST | None | Sign in with Google ID token |
| `/api/auth/oauth/microsoft` | POST | None | Sign in with Microsoft ID token |
| `/api/auth/link` | POST | Required | Link OAuth provider to existing account |
| `/api/auth/refresh` | POST | None | Refresh access token |
| `/api/auth/logout` | POST | None | Revoke refresh token |

### Email Verification

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/email-verification/request-verification` | POST | Required | Request email verification |
| `/api/email-verification/verify-email` | POST | None | Verify email with token |
| `/api/email-verification/verification-status` | GET | Required | Check verification status |

## 🚀 Setup Instructions

See [docs/auth-setup.md](./auth-setup.md) for detailed setup instructions.

### Quick Start

1. **Backend Setup**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and set JWT_SECRET
   npm install
   createdb kitchenwiz
   psql -U postgres -d kitchenwiz -f ../database/schema.sql
   npm run dev
   ```

2. **Frontend Setup**
   ```bash
   cp .env.example .env
   # Edit .env and set EXPO_PUBLIC_API_URL
   npm install
   npx expo start
   ```

## 🧪 Testing

### Manual Testing

Test authentication flows using the AuthScreen in the app, or via curl:

```bash
# Sign up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Access protected endpoint
curl http://localhost:3000/api/user \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Refresh token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

## 📋 Environment Variables

### Backend (.env)

```env
# Required
JWT_SECRET=your_random_secret_key_min_32_chars
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=kitchenwiz

# Optional
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_TENANT_ID=common
```

### Frontend (.env)

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

## 🔄 Auth Flow Diagrams

### Sign Up Flow
```
User → AuthScreen → API (signup) → Create User → Generate Tokens → Store Session → Authenticated
```

### Login Flow
```
User → AuthScreen → API (login) → Verify Password → Generate Tokens → Store Session → Authenticated
```

### OAuth Flow
```
User → OAuth SDK → ID Token → API (oauth) → Verify Token → Create/Link User → Generate Tokens → Authenticated
```

### Token Refresh Flow
```
API Request → 401 Error → Auto Refresh → New Tokens → Retry Request → Success
```

### Logout Flow
```
User → Logout → API (revoke token) → Clear Local State → Guest Mode
```

## 🎯 Next Steps

### Recommended Enhancements

1. **Email Verification**
   - Integrate email service (SendGrid, AWS SES, etc.)
   - Send verification emails on signup
   - Add verification UI in ProfileScreen

2. **Password Reset**
   - Add "Forgot Password" flow
   - Email password reset links
   - Secure token-based password reset

3. **Multi-Factor Authentication**
   - SMS/TOTP support
   - Backup codes
   - Device trust

4. **Rate Limiting**
   - Prevent brute force attacks
   - Limit failed login attempts
   - IP-based rate limiting

5. **Session Management UI**
   - View active sessions
   - Revoke specific sessions
   - Last login tracking

6. **OAuth Integration**
   - Install Google Sign-In SDK
   - Install Microsoft MSAL SDK
   - Configure OAuth apps
   - Update AuthScreen with real OAuth

7. **Security Monitoring**
   - Log suspicious activity
   - Alert on unusual patterns
   - Track failed auth attempts

## 📚 Additional Resources

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OAuth 2.0 Security](https://tools.ietf.org/html/rfc6819)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)
- [jose (JWT library)](https://github.com/panva/jose)

## ❓ Troubleshooting

See [docs/auth-setup.md#troubleshooting](./auth-setup.md#troubleshooting) for common issues and solutions.

## 📄 License

MIT License - See LICENSE file for details
