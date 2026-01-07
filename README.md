# KitchenWiz Mobile

A smart kitchen management mobile app built with React Native (Expo) and powered by Google's Gemini AI.

## Features

- 📦 **Smart Inventory Management** - Track your ingredients with receipt scanning
- 🍳 **AI Recipe Discovery** - Get recipes based on what you have
- 📅 **Meal Planning** - Auto-generate weekly meal plans
- 🛒 **Smart Shopping Lists** - AI-powered shopping suggestions
- 🤖 **Kitchen Assistant** - Chat with an AI cooking helper
- 👤 **Personalization** - Dietary preferences, allergies, and goals

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo Go app on your phone (for development)

### Installation

```bash
# Clone or download the project
cd kitchenwiz-expo

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your Gemini API key to .env

# Start the development server
npx expo start
```

### Running on Device
1. Install **Expo Go** from App Store or Play Store
2. Scan the QR code from your terminal
3. The app will load on your device

## Project Structure

```
kitchenwiz-expo/
├── App.tsx                 # Main app with navigation
├── src/
│   ├── types.ts           # TypeScript interfaces
│   ├── constants/         # Theme colors
│   ├── components/        # Reusable UI components
│   ├── screens/           # App screens
│   └── services/          # API and AI services
├── backend/               # Express.js backend (optional)
├── database/              # PostgreSQL schema
└── docs/                  # Documentation
```

## Configuration

### Environment Variables

```bash
# Required - Get from https://aistudio.google.com/app/apikey
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

# Optional - Only if using backend
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

### Gemini AI Features
- **Receipt Scanning**: Uses Gemini Vision for OCR
- **Recipe Generation**: Creates recipes from your inventory
- **Meal Planning**: Generates 7-day meal plans
- **Chat Assistant**: Conversational cooking help

## Backend Setup (Optional)

The app works offline using local storage. For cloud sync:

```bash
cd backend
npm install
npm run dev
```

See [docs/deployment.md](docs/deployment.md) for production setup.

## Documentation

- [Architecture](docs/architecture.md) - Technical overview
- [Features](docs/features.md) - Feature documentation
- [Authentication](docs/auth-complete.md) - Complete auth system documentation
- [Auth Setup Guide](docs/auth-setup.md) - Step-by-step setup instructions
- [Deployment](docs/deployment.md) - Production deployment guide
- [Roadmap](docs/roadmap.md) - Future improvements

## Authentication

✅ **Complete authentication system implemented!**

- Email/Password authentication
- JWT access & refresh tokens
- OAuth ready (Google & Microsoft)
- Automatic token refresh
- Email verification support
- Secure logout

See [docs/auth-complete.md](docs/auth-complete.md) for full details and [docs/auth-setup.md](docs/auth-setup.md) for setup instructions.

## Tech Stack

- **Frontend**: React Native, Expo SDK 54, TypeScript
- **Navigation**: React Navigation (Bottom Tabs)
- **AI**: Google Generative AI (Gemini)
- **Storage**: AsyncStorage (local), PostgreSQL (cloud)
- **Backend**: Express.js, TypeScript, pg

## License

MIT
.