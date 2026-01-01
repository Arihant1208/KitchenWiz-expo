# KitchenWiz Mobile - Architecture & Development Guide

## Overview
KitchenWiz is a smart kitchen assistant mobile app built with React Native (Expo) and powered by Google's Gemini AI. It helps users manage their kitchen inventory, plan meals, reduce food waste, and streamline shopping.

## Tech Stack

### Mobile App (Frontend)
- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript
- **Navigation**: React Navigation (Bottom Tabs)
- **State Management**: React Hooks (useState, useEffect)
- **Storage**: AsyncStorage (local persistence)
- **AI Integration**: Google Generative AI SDK (`@google/generative-ai`)
- **Icons**: Expo Vector Icons (Ionicons)
- **Image Picking**: Expo Image Picker

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Raw SQL with `pg` driver

## Project Structure

```
kitchenwiz-expo/
├── App.tsx                     # Main app entry with navigation
├── app.json                    # Expo configuration
├── .env                        # Environment variables
├── src/
│   ├── types.ts               # TypeScript interfaces
│   ├── constants/
│   │   └── colors.ts          # Theme colors
│   ├── components/
│   │   └── Button.tsx         # Reusable UI components
│   ├── services/
│   │   ├── storage.ts         # AsyncStorage wrapper
│   │   ├── geminiService.ts   # AI integration layer
│   │   └── api.ts             # Backend API client (optional)
│   └── screens/
│       ├── DashboardScreen.tsx
│       ├── InventoryScreen.tsx
│       ├── RecipesScreen.tsx
│       ├── PlannerScreen.tsx
│       ├── AssistantScreen.tsx
│       └── ProfileScreen.tsx
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── server.ts          # Express app
│   │   ├── db.ts              # PostgreSQL connection
│   │   └── routes/
│   │       ├── user.ts
│   │       ├── inventory.ts
│   │       ├── recipes.ts
│   │       ├── mealPlan.ts
│   │       └── shoppingList.ts
├── database/
│   └── schema.sql             # PostgreSQL schema
└── docs/
    ├── architecture.md        # This file
    ├── features.md            # Feature documentation
    ├── deployment.md          # Deployment guide
    └── roadmap.md             # Future plans
```

## State Management

### Local Storage (Default Mode)
The app uses **AsyncStorage** for local data persistence:
- All data is stored on the device
- Works offline
- Data persists across app restarts
- Located in `src/services/storage.ts`

### Backend Mode (Optional)
For cloud sync, the app can connect to the Express backend:
1. Set up PostgreSQL database using `database/schema.sql`
2. Configure backend environment variables
3. Update `src/services/api.ts` to use HTTP endpoints
4. Replace storage calls with API calls in App.tsx

## AI Integration

### Gemini Service (`src/services/geminiService.ts`)
- **Model**: `gemini-1.5-flash` for fast responses
- **Receipt Scanning**: Vision API for OCR on grocery receipts
- **Recipe Generation**: Text generation with JSON output
- **Meal Planning**: 7-day meal plan generation
- **Shopping List**: Delta analysis between inventory and meal plan
- **Chat Assistant**: Conversational AI for cooking help

### API Key Setup
1. Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Add to `.env`:
   ```
   EXPO_PUBLIC_GEMINI_API_KEY=your_api_key_here
   ```

## Key Workflows

### 1. App Startup
```
App.tsx mounts
  → Load data from AsyncStorage
  → Populate state (inventory, user, mealPlan, recipes, shoppingList)
  → Render navigation
```

### 2. Receipt Scanning
```
InventoryScreen
  → ImagePicker.launchImageLibraryAsync()
  → Convert to base64
  → geminiService.parseReceiptImage()
  → Add items to inventory state
  → Auto-save to AsyncStorage
```

### 3. Recipe Generation
```
RecipesScreen
  → User taps "Generate"
  → geminiService.generateRecipesFromInventory(inventory, user)
  → Add recipes to state
  → Display with match scores
```

### 4. Meal Planning
```
PlannerScreen
  → User taps "Generate"
  → geminiService.generateWeeklyMealPlan(user, inventory)
  → Save 7-day plan to state
  → Auto-save to AsyncStorage
```

### 5. Shopping List Generation
```
InventoryScreen (Shopping tab)
  → User taps "Generate"
  → geminiService.generateShoppingList(inventory, mealPlan)
  → Add items to shopping list
  → User checks off items as purchased
  → "Move to Stock" transfers to inventory
```

## Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user` | Get user profile |
| PUT | `/api/user` | Update user profile |
| GET | `/api/inventory` | Get inventory items |
| POST | `/api/inventory` | Add inventory item |
| POST | `/api/inventory/sync` | Sync all inventory |
| GET | `/api/recipes/discovered` | Get discovered recipes |
| GET | `/api/recipes/saved` | Get saved recipes |
| POST | `/api/recipes/discovered` | Sync discovered recipes |
| POST | `/api/recipes/saved` | Sync saved recipes |
| GET | `/api/meal-plan` | Get meal plan |
| POST | `/api/meal-plan/sync` | Sync meal plan |
| GET | `/api/shopping-list` | Get shopping list |
| POST | `/api/shopping-list/sync` | Sync shopping list |
| POST | `/api/shopping-list/move-to-inventory` | Move checked items |
| GET | `/health` | Health check |

## Running Locally

### Mobile App
```bash
cd kitchenwiz-expo
npm install
npx expo start
```

### Backend (Optional)
```bash
cd kitchenwiz-expo/backend
npm install
# Set up PostgreSQL and run database/schema.sql
# Copy .env.example to .env and configure
npm run dev
```

## Testing
- Use Expo Go app on your phone to test
- Scan the QR code from `npx expo start`
- For iOS simulator: Press `i`
- For Android emulator: Press `a`
