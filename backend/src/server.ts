import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import inventoryRoutes from './routes/inventory';
import recipeRoutes from './routes/recipes';
import mealPlanRoutes from './routes/mealPlan';
import shoppingListRoutes from './routes/shoppingList';

import { requireAuth } from './auth/middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for image uploads

// Routes
app.use('/api/auth', authRoutes);

app.use('/api/user', requireAuth, userRoutes);
app.use('/api/inventory', requireAuth, inventoryRoutes);
app.use('/api/recipes', requireAuth, recipeRoutes);
app.use('/api/meal-plan', requireAuth, mealPlanRoutes);
app.use('/api/shopping-list', requireAuth, shoppingListRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), version: '1.0.0' });
});

// API health (matches frontend BASE_URL + '/health')
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), version: '1.0.0' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'KitchenWiz API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      user: '/api/user',
      inventory: '/api/inventory',
      recipes: '/api/recipes',
      mealPlan: '/api/meal-plan',
      shoppingList: '/api/shopping-list'
    }
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 KitchenWiz API Server running on http://localhost:${PORT}`);
  console.log(`📚 Health check: http://localhost:${PORT}/health`);
});

export default app;
