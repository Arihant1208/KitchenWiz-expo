import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ingredient, Recipe, MealPlanDay, UserProfile, ShoppingItem, AuthSession } from '../types';

const KEYS = {
  INVENTORY: 'kitchenwiz_inventory',
  USER: 'kitchenwiz_user',
  RECIPES: 'kitchenwiz_recipes',
  SAVED_RECIPES: 'kitchenwiz_saved_recipes',
  MEAL_PLAN: 'kitchenwiz_meal_plan',
  SHOPPING_LIST: 'kitchenwiz_shopping_list',
  AUTH: 'kitchenwiz_auth',
};

const defaultUser: UserProfile = {
  name: '',
  dietaryRestrictions: [],
  allergies: [],
  goals: 'maintenance',
  cookingSkill: 'intermediate',
  householdSize: 1,
  cuisinePreferences: [],
  maxCookingTime: 60,
};

const defaultAuth: AuthSession = {
  mode: 'guest',
};

export const storage = {
  auth: {
    get: async (): Promise<AuthSession> => {
      try {
        const data = await AsyncStorage.getItem(KEYS.AUTH);
        return data ? JSON.parse(data) : defaultAuth;
      } catch {
        return defaultAuth;
      }
    },
    save: async (session: AuthSession): Promise<void> => {
      await AsyncStorage.setItem(KEYS.AUTH, JSON.stringify(session));
    },
  },

  inventory: {
    get: async (): Promise<Ingredient[]> => {
      try {
        const data = await AsyncStorage.getItem(KEYS.INVENTORY);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    },
    save: async (items: Ingredient[]): Promise<void> => {
      await AsyncStorage.setItem(KEYS.INVENTORY, JSON.stringify(items));
    },
  },

  user: {
    get: async (): Promise<UserProfile> => {
      try {
        const data = await AsyncStorage.getItem(KEYS.USER);
        return data ? JSON.parse(data) : defaultUser;
      } catch {
        return defaultUser;
      }
    },
    save: async (profile: UserProfile): Promise<void> => {
      await AsyncStorage.setItem(KEYS.USER, JSON.stringify(profile));
    },
  },

  recipes: {
    get: async (): Promise<Recipe[]> => {
      try {
        const data = await AsyncStorage.getItem(KEYS.RECIPES);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    },
    save: async (recipes: Recipe[]): Promise<void> => {
      await AsyncStorage.setItem(KEYS.RECIPES, JSON.stringify(recipes));
    },
  },

  savedRecipes: {
    get: async (): Promise<Recipe[]> => {
      try {
        const data = await AsyncStorage.getItem(KEYS.SAVED_RECIPES);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    },
    save: async (recipes: Recipe[]): Promise<void> => {
      await AsyncStorage.setItem(KEYS.SAVED_RECIPES, JSON.stringify(recipes));
    },
  },

  mealPlan: {
    get: async (): Promise<MealPlanDay[]> => {
      try {
        const data = await AsyncStorage.getItem(KEYS.MEAL_PLAN);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    },
    save: async (plan: MealPlanDay[]): Promise<void> => {
      await AsyncStorage.setItem(KEYS.MEAL_PLAN, JSON.stringify(plan));
    },
  },

  shoppingList: {
    get: async (): Promise<ShoppingItem[]> => {
      try {
        const data = await AsyncStorage.getItem(KEYS.SHOPPING_LIST);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    },
    save: async (list: ShoppingItem[]): Promise<void> => {
      await AsyncStorage.setItem(KEYS.SHOPPING_LIST, JSON.stringify(list));
    },
  },
};
