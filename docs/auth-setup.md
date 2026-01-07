# Authentication Setup Guide

This guide covers setting up the authentication system for KitchenWiz.

## Backend Setup

### 1. Environment Variables

Copy the example environment file:
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your configuration:

#### Required Variables
```env
# JWT Configuration - REQUIRED
JWT_SECRET=your_random_secret_key_min_32_chars_long_change_this_in_production
JWT_ISSUER=kitchenwiz
JWT_AUDIENCE=kitchenwiz-mobile
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_SECONDS=2592000
```

**Important**: Generate a strong random secret for `JWT_SECRET`. You can use:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Optional OAuth Variables
For Google Sign-In:
```env
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
```

For Microsoft Sign-In:
```env
MICROSOFT_CLIENT_ID=your_microsoft_client_id_here
MICROSOFT_TENANT_ID=common
```

### 2. Database Setup

Make sure PostgreSQL is running, then create and initialize the database:

```bash
# Create database
createdb kitchenwiz

# Or using psql
psql -U postgres
CREATE DATABASE kitchenwiz;
\q

# Initialize schema
psql -U postgres -d kitchenwiz -f ../database/schema.sql
```

### 3. Install Dependencies

```bash
cd backend
npm install
```

### 4. Start Backend Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm run build
npm start
```

The server will run on `http://localhost:3000`

## Frontend Setup

### 1. Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

For production, update `EXPO_PUBLIC_API_URL` to your deployed backend URL.

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Expo App

```bash
npx expo start
```

## Authentication Features

### Email/Password Authentication
✅ **Implemented and Working**

- Sign up with email, password, and optional name
- Login with email and password
- Password hashing with bcrypt (12 rounds)
- JWT access tokens (15 minutes expiry)
- Refresh tokens (30 days expiry)
- Token rotation on refresh
- Secure token storage

**Usage**: Users can sign up or log in using the AuthScreen in the app.

### OAuth Sign-In (Google/Microsoft)
⚠️ **Backend Ready, Frontend Integration Pending**

The backend fully supports OAuth sign-in with Google and Microsoft:
- ID token verification
- Automatic account creation
- Account linking prevention (requires explicit linking)
- Email verification tracking

**To Enable OAuth in Frontend**:

1. Install required packages:
```bash
npm install @react-native-google-signin/google-signin
npm install @azure/msal-react-native
```

2. Configure OAuth providers in your app.json/app.config.js

3. Update AuthScreen.tsx to use the actual OAuth SDKs instead of placeholder alerts

See [OAuth Integration Guide](#oauth-integration-guide) below for detailed steps.

### Token Refresh
✅ **Implemented**

- Automatic token refresh when access token expires
- Refresh token rotation for security
- Handles 401 errors and retries requests

### Logout
✅ **Implemented**

- Revokes refresh token on server
- Clears local auth state
- Can be triggered from ProfileScreen

### Account Linking
✅ **Implemented**

- Users can link Google/Microsoft accounts to existing email/password accounts
- Prevents duplicate accounts
- Available via `/api/auth/link` endpoint

## OAuth Integration Guide

### Google Sign-In Setup

1. **Create Google OAuth Client**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add your iOS bundle ID and Android package name
   - Download the configuration files

2. **Update Backend .env**
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   ```

3. **Install Frontend Package**
   ```bash
   npm install @react-native-google-signin/google-signin
   ```

4. **Configure in app.json**
   ```json
   {
     "expo": {
       "android": {
         "googleServicesFile": "./google-services.json"
       },
       "ios": {
         "googleServicesFile": "./GoogleService-Info.plist"
       }
     }
   }
   ```

5. **Update AuthScreen.tsx** to call `api.auth.oauthGoogle({ idToken })`

### Microsoft Sign-In Setup

1. **Register Application**
   - Go to [Azure Portal](https://portal.azure.com/)
   - Register a new application in Azure AD
   - Add mobile platform
   - Note your Application (client) ID

2. **Update Backend .env**
   ```env
   MICROSOFT_CLIENT_ID=your_microsoft_client_id
   MICROSOFT_TENANT_ID=common
   ```

3. **Install Frontend Package**
   ```bash
   npm install @azure/msal-react-native
   ```

4. **Update AuthScreen.tsx** to call `api.auth.oauthMicrosoft({ idToken })`

## Security Best Practices

### Production Checklist

- [ ] Use a strong, randomly generated `JWT_SECRET` (min 32 characters)
- [ ] Never commit `.env` files to version control
- [ ] Use HTTPS for all API communications in production
- [ ] Set appropriate `JWT_ISSUER` and `JWT_AUDIENCE` values
- [ ] Configure CORS to only allow your frontend origin
- [ ] Use secure password requirements (enforced: min 8 characters)
- [ ] Implement rate limiting on auth endpoints
- [ ] Monitor refresh token usage for suspicious patterns
- [ ] Implement email verification for new accounts
- [ ] Add multi-factor authentication (optional)

### Token Security

- **Access Tokens**: Short-lived (15 minutes), stored in memory only
- **Refresh Tokens**: 
  - Long-lived (30 days)
  - Stored hashed in database
  - Rotated on each use
  - Can be revoked
  - Track device/IP for security monitoring

### Password Security

- Passwords hashed with bcrypt (12 rounds)
- No password stored in plain text
- Minimum 8 characters enforced
- Consider adding: uppercase, number, special character requirements

## Testing Authentication

### Manual Testing

1. **Sign Up**
   ```bash
   curl -X POST http://localhost:3000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpass123","name":"Test User"}'
   ```

2. **Login**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpass123"}'
   ```

3. **Access Protected Endpoint**
   ```bash
   curl http://localhost:3000/api/user \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```

4. **Refresh Token**
   ```bash
   curl -X POST http://localhost:3000/api/auth/refresh \
     -H "Content-Type: application/json" \
     -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
   ```

5. **Logout**
   ```bash
   curl -X POST http://localhost:3000/api/auth/logout \
     -H "Content-Type: application/json" \
     -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
   ```

## Troubleshooting

### Common Issues

**"Missing required env var: JWT_SECRET"**
- Solution: Make sure `JWT_SECRET` is set in `backend/.env`

**"Database connection failed"**
- Solution: Verify PostgreSQL is running and credentials in `.env` are correct

**"Invalid credentials" on login**
- Solution: Double-check email and password, ensure user exists

**"HTTP 401" errors**
- Solution: Access token may be expired, check token refresh logic

**OAuth "Invalid idToken"**
- Solution: Verify `GOOGLE_CLIENT_ID` or `MICROSOFT_CLIENT_ID` matches your OAuth app configuration

### Debug Mode

Enable debug logging in backend by adding to `server.ts`:
```typescript
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});
```

## Next Steps

- [ ] Implement email verification flow
- [ ] Add password reset functionality
- [ ] Integrate OAuth in frontend
- [ ] Add rate limiting
- [ ] Implement session management UI
- [ ] Add multi-factor authentication
- [ ] Set up monitoring and logging
