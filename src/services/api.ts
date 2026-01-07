/**
 * KitchenWiz API Service
 * Handles all communication with the backend server
 * Switch from storage.ts to this for cloud sync functionality
 */

import { Ingredient, UserProfile, Recipe, MealPlanDay, ShoppingItem } from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
  refreshTokenExpiresInSeconds: number;
};

let accessToken: string | null = null;
let refreshToken: string | null = null;

export const authTokenStore = {
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
  },
  clear: () => {
    accessToken = null;
    refreshToken = null;
  },
  getAccessToken: () => accessToken,
  getRefreshToken: () => refreshToken,
};

/**
 * Helper function for API requests
 */
async function rawRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    return await rawRequest<T>(endpoint, options);
  } catch (err: any) {
    const message = typeof err?.message === 'string' ? err.message : '';
    const isUnauthorized = message.includes('HTTP 401');
    const isAuthEndpoint = endpoint.startsWith('/auth/');

    if (!isUnauthorized || isAuthEndpoint || !refreshToken) {
      throw err;
    }

    // Try refresh once, then retry the original request.
    const refreshed = await rawRequest<TokenPair>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    authTokenStore.setTokens({ accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken });
    return rawRequest<T>(endpoint, options);
  }
}

/**
 * Auth API
 */
export const authApi = {
  signup: async (payload: { email: string; password: string; name?: string }) => {
    const result = await request<{ user: { id: string; email: string; name: string } } & TokenPair>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    authTokenStore.setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    return result;
  },

  login: async (payload: { email: string; password: string }) => {
    const result = await request<{ user: { id: string; email: string; name: string } } & TokenPair>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    authTokenStore.setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    return result;
  },

  oauthGoogle: async (payload: { idToken: string }) => {
    const result = await request<{ user: { id: string; email: string | null; name: string } } & TokenPair>('/auth/oauth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    authTokenStore.setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    return result;
  },

  oauthMicrosoft: async (payload: { idToken: string }) => {
    const result = await request<{ user: { id: string; email: string | null; name: string } } & TokenPair>('/auth/oauth/microsoft', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    authTokenStore.setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    return result;
  },

  linkProvider: async (payload: { provider: 'google' | 'microsoft'; idToken: string }) => {
    return request<{ success: boolean }>('/auth/link', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  logout: async () => {
    const token = refreshToken;
    authTokenStore.clear();
    if (!token) return;
    await request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: token }),
    });
  },

  requestEmailVerification: async () => {
    return request<{ message: string; token?: string }>('/email-verification/request-verification', {
      method: 'POST',
    });
  },

  verifyEmail: async (token: string) => {
    return request<{ success: boolean; message: string }>('/email-verification/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  getVerificationStatus: async () => {
    return request<{ emailVerified: boolean; hasEmail: boolean }>('/email-verification/verification-status');
  },
};

/**
 * User Profile API
 */
export const userApi = {
  get: async (): Promise<UserProfile | null> => {
    try {
      return await request<UserProfile>('/user');
    } catch {
      return null;
    }
  },

  update: async (profile: UserProfile): Promise<UserProfile> => {
    return request<UserProfile>('/user', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  },
};

/**
 * Inventory API
 */
export const inventoryApi = {
  getAll: async (): Promise<Ingredient[]> => {
    try {
      const data = await request<{ items: Ingredient[] }>('/inventory');
      return data.items || [];
    } catch {
      return [];
    }
  },

  add: async (item: Ingredient): Promise<Ingredient> => {
    return request<Ingredient>('/inventory', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  update: async (id: string, item: Partial<Ingredient>): Promise<Ingredient> => {
    return request<Ingredient>(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  },

  delete: async (id: string): Promise<void> => {
    await request(`/inventory/${id}`, { method: 'DELETE' });
  },

  sync: async (items: Ingredient[]): Promise<void> => {
    await request('/inventory/sync', {
      method: 'POST',
      body: JSON.stringify({
        items,
      }),
    });
  },
};

/**
 * Recipes API
 */
export const recipesApi = {
  getDiscovered: async (): Promise<Recipe[]> => {
    try {
      const data = await request<{ recipes: Recipe[] }>('/recipes/discovered');
      return data.recipes || [];
    } catch {
      return [];
    }
  },

  getSaved: async (): Promise<Recipe[]> => {
    try {
      const data = await request<{ recipes: Recipe[] }>('/recipes/saved');
      return data.recipes || [];
    } catch {
      return [];
    }
  },

  save: async (recipeId: string): Promise<void> => {
    await request(`/recipes/${recipeId}/save`, { method: 'POST' });
  },

  unsave: async (recipeId: string): Promise<void> => {
    await request(`/recipes/${recipeId}/unsave`, { method: 'POST' });
  },

  syncDiscovered: async (recipes: Recipe[]): Promise<void> => {
    await request('/recipes/discovered', {
      method: 'POST',
      body: JSON.stringify({
        recipes,
      }),
    });
  },

  syncSaved: async (recipes: Recipe[]): Promise<void> => {
    await request('/recipes/saved', {
      method: 'POST',
      body: JSON.stringify({
        recipes,
      }),
    });
  },
};

/**
 * Meal Plan API
 */
export const mealPlanApi = {
  get: async (): Promise<MealPlanDay[]> => {
    try {
      const data = await request<{ mealPlan: MealPlanDay[] }>('/meal-plan');
      return data.mealPlan || [];
    } catch {
      return [];
    }
  },

  sync: async (mealPlan: MealPlanDay[]): Promise<void> => {
    await request('/meal-plan/sync', {
      method: 'POST',
      body: JSON.stringify({
        mealPlan,
      }),
    });
  },

  updateDay: async (day: string, meals: Partial<MealPlanDay>): Promise<void> => {
    await request(`/meal-plan/${day}`, {
      method: 'PUT',
      body: JSON.stringify(meals),
    });
  },
};

/**
 * Shopping List API
 */
export const shoppingListApi = {
  getAll: async (): Promise<ShoppingItem[]> => {
    try {
      const data = await request<{ items: ShoppingItem[] }>('/shopping-list');
      return data.items || [];
    } catch {
      return [];
    }
  },

  add: async (item: ShoppingItem): Promise<ShoppingItem> => {
    return request<ShoppingItem>('/shopping-list', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  update: async (id: string, item: Partial<ShoppingItem>): Promise<ShoppingItem> => {
    return request<ShoppingItem>(`/shopping-list/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  },

  delete: async (id: string): Promise<void> => {
    await request(`/shopping-list/${id}`, { method: 'DELETE' });
  },

  toggleChecked: async (id: string): Promise<void> => {
    await request(`/shopping-list/${id}/toggle`, { method: 'POST' });
  },

  sync: async (items: ShoppingItem[]): Promise<void> => {
    await request('/shopping-list/sync', {
      method: 'POST',
      body: JSON.stringify({
        items,
      }),
    });
  },

  moveToInventory: async (itemIds: string[]): Promise<void> => {
    await request('/shopping-list/move-to-inventory', {
      method: 'POST',
      body: JSON.stringify({ itemIds }),
    });
  },
};

/**
 * Health Check
 */
export const healthCheck = async (): Promise<boolean> => {
  try {
    await request<{ status: string }>('/health');
    return true;
  } catch {
    return false;
  }
};

/**
 * Combined API object for convenience
 */
export const api = {
  auth: authApi,
  user: userApi,
  inventory: inventoryApi,
  recipes: recipesApi,
  mealPlan: mealPlanApi,
  shoppingList: shoppingListApi,
  healthCheck,
};

export default api;
