# Contributing to KitchenWiz

This guide covers how to contribute to the KitchenWiz project, including code style, git workflow, and project structure.

## 📁 Backend Project Structure

```
backend/src/
├── constants/           # Configuration values and limits
│   └── index.ts        # Exports: DAILY_AI_REQUEST_LIMIT, MEAL_TYPES, etc.
│
├── helpers/            # Pure utility functions
│   ├── index.ts        # Barrel export
│   ├── ids.ts          # ID generation (randomId, randomLongId)
│   ├── json.ts         # JSON parsing (cleanJson, parseLlmJson)
│   ├── dates.ts        # Date utilities (getLocalDayKey)
│   └── validation.ts   # Type guards and validators
│
├── mappers/            # Data transformation (DB <-> API)
│   ├── index.ts        # Barrel export
│   ├── recipe.ts       # Recipe row to response mapping
│   └── inventory.ts    # Inventory row to response mapping
│
├── services/           # Business logic layer
│   ├── index.ts        # Barrel export
│   ├── ai.ts           # Gemini model management, generateJson, chat
│   ├── quota.ts        # AI usage tracking and rate limiting
│   └── recipeGeneration.ts  # Recipe retrieval, ranking, generation
│
├── recipes/            # Recipe-specific logic
│   ├── library.ts      # Recipe library CRUD and search
│   ├── scoring.ts      # Ranking algorithms and reuse gate
│   ├── taste.ts        # Taste embedding system
│   ├── weeklyOptimizer.ts  # Weekly variety and effort balancing
│   └── normalize.ts    # Ingredient normalization
│
├── routes/             # Express route handlers (thin controllers)
│   ├── ai.ts           # AI endpoints (recipes, meal plans, chat)
│   ├── auth.ts         # Authentication endpoints
│   ├── inventory.ts    # Inventory CRUD
│   ├── recipes.ts      # User recipe management
│   ├── interactions.ts # Taste learning signals
│   └── ...
│
├── auth/               # Authentication logic
│   ├── middleware.ts   # requireAuth middleware
│   ├── tokens.ts       # JWT handling
│   └── ...
│
├── db.ts               # Database connection and query helper
├── logger.ts           # Pino logger configuration
└── server.ts           # Express app setup
```

## 🏛️ Architecture Principles

### 1. Separation of Concerns

- **Routes**: Thin controllers - validate input, call services, format response
- **Services**: Business logic - orchestrate operations, handle complex flows
- **Helpers**: Pure functions - no side effects, easily testable
- **Mappers**: Data transformation - convert between layers

### 2. Import Order

```typescript
// 1. External packages
import { Router, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 2. Internal constants and types
import { DAILY_AI_REQUEST_LIMIT } from '../constants';

// 3. Internal helpers
import { randomId, cleanJson } from '../helpers';

// 4. Internal services
import { generateJson, checkAndIncrementQuota } from '../services';

// 5. Internal mappers
import { mapLibraryRowToRecipe } from '../mappers';
```

### 3. Error Handling

Always use structured logging:

```typescript
try {
  // operation
} catch (err) {
  req.log.error({ err, action: 'action_name', context: 'value' }, 'Human readable message');
  return res.status(500).json({ message: 'User-friendly error' });
}
```

## 🔀 Git Workflow

### Branch Naming

```
feature/add-taste-learning
fix/inventory-sync-error
refactor/modularize-ai-routes
docs/update-api-reference
chore/upgrade-dependencies
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add taste embedding system for personalization
fix: resolve inventory sync race condition
refactor: extract AI service from routes
docs: add API endpoint documentation
chore: update TypeScript to 5.x
test: add unit tests for scoring module
```

### Commit Best Practices

1. **Atomic commits**: Each commit should do one thing
2. **Build passes**: Every commit should compile
3. **Descriptive messages**: Explain what AND why

### Pull Request Process

1. Create feature branch from `main`
2. Make changes with atomic commits
3. Ensure `npm run build` passes
4. Push and create PR
5. Wait for review and approval
6. Squash merge to `main`

## 🛠️ Development Workflow

### Setup

```bash
cd backend
npm install
cp .env.example .env  # Configure environment
npm run dev           # Start development server
```

### Building

```bash
npm run build         # TypeScript compilation
```

### Testing

```bash
npm test              # Run tests (when available)
```

### Code Quality

- Use TypeScript strict mode
- Export explicit types
- Avoid `any` - use proper types or `unknown`
- Add JSDoc comments for public functions

## 📝 Adding New Features

### 1. Add a New Helper

```typescript
// src/helpers/newHelper.ts
export function myHelper(input: string): string {
  return input.trim().toLowerCase();
}

// src/helpers/index.ts
export * from './newHelper';
```

### 2. Add a New Service

```typescript
// src/services/newService.ts
import { query } from '../db';
import { logger } from '../logger';

export async function doSomething(userId: string): Promise<Result> {
  // business logic here
}

// src/services/index.ts
export * from './newService';
```

### 3. Add a New Route

```typescript
// src/routes/newRoute.ts
import { Router, Response } from 'express';
import { doSomething } from '../services';

const router = Router();

router.get('/', async (req: any, res: Response) => {
  try {
    const result = await doSomething(req.user.id);
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, 'Operation failed');
    return res.status(500).json({ message: 'Failed' });
  }
});

export default router;
```

Don't forget to register in `server.ts`:

```typescript
import newRoutes from './routes/newRoute';
app.use('/api/new', requireAuth, newRoutes);
```

## 🔐 Environment Variables

Required:

```
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
JWT_SECRET=...
```

Optional:

```
PORT=3000
GEMINI_MODEL=gemini-2.5-flash
NODE_ENV=development
```

## 📚 Related Documentation

- [Architecture Overview](./docs/architecture.md)
- [Authentication Guide](./docs/auth.md)
- [Database Setup](./docs/database-setup.md)
- [Deployment Guide](./docs/deployment.md)
