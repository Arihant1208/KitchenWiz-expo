# KitchenWiz Mobile - Deployment Guide

This guide covers deploying the KitchenWiz mobile app and its optional backend services.

## Overview

KitchenWiz consists of:
1. **Mobile App** (React Native/Expo) - Required
2. **Backend API** (Node.js/Express) - Optional
3. **Database** (PostgreSQL) - Required only for backend

By default, the app works standalone using local device storage.

---

## 1. Mobile App Deployment

### Development Build

```bash
cd kitchenwiz-expo
npm install
npx expo start
```

Options:
- Press `a` for Android emulator
- Press `i` for iOS simulator (Mac only)
- Scan QR code with Expo Go app

### Production Build (Expo Application Services)

#### Setup EAS
```bash
npm install -g eas-cli
eas login
eas build:configure
```

#### Build for Stores
```bash
# Android (APK for testing)
eas build --platform android --profile preview

# Android (AAB for Play Store)
eas build --platform android --profile production

# iOS (for App Store)
eas build --platform ios --profile production
```

#### Environment Variables for EAS
Create `eas.json`:
```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_GEMINI_API_KEY": "your_api_key",
        "EXPO_PUBLIC_API_URL": "https://your-backend.com/api"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_GEMINI_API_KEY": "your_production_api_key",
        "EXPO_PUBLIC_API_URL": "https://your-backend.com/api"
      }
    }
  }
}
```

### Over-the-Air Updates
```bash
eas update --branch production --message "Bug fixes"
```

---

## 2. Backend Deployment

The backend is optional but required for:
- Multi-device sync
- Cloud data backup
- User authentication (future)

### Option A: Render.com

1. Create account at [render.com](https://render.com)

2. Create **PostgreSQL Database**
   - Click "New" → "PostgreSQL"
   - Note the connection details

3. Create **Web Service**
   - Click "New" → "Web Service"
   - Connect GitHub repository
   - Settings:
     - **Root Directory**: `backend`
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
   - Environment Variables:
     ```
     PORT=3000
     DB_HOST=your-postgres-host
     DB_USER=your-user
     DB_PASSWORD=your-password
     DB_NAME=your-database
     DB_PORT=5432
     ```

4. Run database migrations
   - Go to PostgreSQL dashboard
   - Open "PSQL" shell
   - Paste contents of `database/schema.sql`

### Option B: Railway.app

1. Create account at [railway.app](https://railway.app)

2. Create new project from GitHub

3. Add PostgreSQL plugin

4. Configure service:
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

5. Set environment variables (Railway auto-provides DATABASE_URL)

### Option C: DigitalOcean App Platform

1. Create App from GitHub

2. Add PostgreSQL database component

3. Configure:
   - Source Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Run Command: `npm start`

4. Set environment variables

---

## 3. Database Setup (PostgreSQL)

### Local Development
```bash
# Install PostgreSQL
# macOS
brew install postgresql

# Ubuntu
sudo apt install postgresql

# Create database
createdb kitchenwiz

# Run schema
psql kitchenwiz < database/schema.sql
```

### Cloud Options

#### Supabase (Free Tier)
1. Create project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run `database/schema.sql`
4. Get connection string from Settings → Database

#### Neon (Serverless)
1. Create project at [neon.tech](https://neon.tech)
2. Run schema via SQL console
3. Copy connection string

#### ElephantSQL (Free)
1. Create instance at [elephantsql.com](https://elephantsql.com)
2. Run schema via browser console

---

## 4. Environment Configuration

### Mobile App (`.env`)
```bash
# Required
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

# Optional (for backend mode)
EXPO_PUBLIC_API_URL=https://your-backend.onrender.com/api
```

### Backend (`.env`)
```bash
PORT=3000
DB_HOST=your-host
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=kitchenwiz
DB_PORT=5432
```

---

## 5. Connecting Mobile App to Backend

To use the backend instead of local storage, update `src/services/api.ts`:

```typescript
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export const api = {
  inventory: {
    get: async () => {
      const res = await fetch(`${BASE_URL}/inventory`);
      return res.json();
    },
    sync: async (items: Ingredient[]) => {
      await fetch(`${BASE_URL}/inventory/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      });
    },
  },
  // ... other endpoints
};
```

Then update `App.tsx` to use `api` instead of `storage`.

---

## 6. App Store Submission

### Google Play Store

1. Build production AAB:
   ```bash
   eas build --platform android --profile production
   ```

2. Create Google Play Console account ($25 one-time)

3. Create new app and upload AAB

4. Fill in store listing:
   - App name, description, screenshots
   - Privacy policy URL
   - Content rating questionnaire

5. Submit for review

### Apple App Store

1. Build for iOS:
   ```bash
   eas build --platform ios --profile production
   ```

2. Create Apple Developer account ($99/year)

3. Submit via App Store Connect:
   ```bash
   eas submit --platform ios
   ```

4. Fill in App Store listing

5. Submit for review

---

## 7. Monitoring & Analytics

### Recommended Services

- **Sentry**: Error tracking
  ```bash
  npx expo install @sentry/react-native
  ```

- **Analytics**: Expo Analytics or Firebase Analytics

- **Backend Monitoring**: Render/Railway dashboards, or add:
  - New Relic
  - Datadog
  - LogRocket

---

## 8. CI/CD Pipeline

### GitHub Actions Example

`.github/workflows/build.yml`:
```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - name: Install dependencies
        run: npm install
        
      - name: Run type check
        run: npm run type-check
        
      - name: Build with EAS
        run: npx eas-cli build --platform all --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

---

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check connection string
   - Verify PostgreSQL is running
   - Check firewall/network settings

2. **Build fails on EAS**
   - Check `app.json` configuration
   - Verify all dependencies installed
   - Check build logs for specific errors

3. **API not reachable from app**
   - Ensure HTTPS for production
   - Check CORS configuration
   - Verify URL in environment variables

4. **Gemini API errors**
   - Verify API key is valid
   - Check quota/billing in Google Cloud
   - Review rate limits
