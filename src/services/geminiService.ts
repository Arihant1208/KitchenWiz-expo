import { Ingredient, Recipe, MealPlanDay, UserProfile, ShoppingItem, ChatMessage, RecipeGenerationPreferences } from '../types';
import { apiFetch } from './api';

// NOTE: All Gemini calls are proxied through the backend so the API key stays server-side.

export const parseReceiptImage = async (base64Data: string, mimeType: string = 'image/jpeg'): Promise<Ingredient[]> => {
  try {
    const items = await apiFetch<Ingredient[]>('/ai/receipt-parse', {
      method: 'POST',
      body: JSON.stringify({ base64Data, mimeType }),
    });

    return (items || []).map((item: any) => ({
      ...item,
      id: item?.id || Math.random().toString(36).substring(7),
    }));
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to read receipt.');
  }
};

export const generateRecipesFromInventory = async (
  inventory: Ingredient[],
  user: UserProfile,
  prefs?: Partial<RecipeGenerationPreferences>,
): Promise<Recipe[]> => {
  try {
    const recipes = await apiFetch<Recipe[]>('/ai/recipes-from-inventory', {
      method: 'POST',
      body: JSON.stringify({ inventory, user, prefs }),
    });

    return (recipes || []).map((r: any) => ({
      ...r,
      id: r?.id || Math.random().toString(36).substring(7),
    }));
  } catch (error) {
    console.error('Recipe Gen Error:', error);
    return [];
  }
};

export const generateWeeklyMealPlan = async (user: UserProfile, inventory: Ingredient[]): Promise<MealPlanDay[]> => {
  try {
    const plan = await apiFetch<MealPlanDay[]>('/ai/weekly-meal-plan', {
      method: 'POST',
      body: JSON.stringify({ user, inventory }),
    });

    return (plan || []).map((day: any) => ({
      ...day,
      breakfast: day.breakfast ? { ...day.breakfast, id: day.breakfast.id || Math.random().toString(36).substring(7) } : undefined,
      lunch: day.lunch ? { ...day.lunch, id: day.lunch.id || Math.random().toString(36).substring(7) } : undefined,
      dinner: day.dinner ? { ...day.dinner, id: day.dinner.id || Math.random().toString(36).substring(7) } : undefined,
    }));
  } catch (error) {
    console.error('Meal Plan Error:', error);
    return [];
  }
};

export const generateShoppingList = async (inventory: Ingredient[], mealPlan: MealPlanDay[]): Promise<ShoppingItem[]> => {
  try {
    const items = await apiFetch<ShoppingItem[]>('/ai/shopping-list', {
      method: 'POST',
      body: JSON.stringify({ inventory, mealPlan }),
    });

    return (items || []).map((item: any) => ({
      ...item,
      id: item?.id || Math.random().toString(36).substring(7),
      checked: Boolean(item?.checked),
    }));
  } catch (error) {
    console.error('Shopping List Error:', error);
    return [];
  }
};

// Chat with AI Assistant
let chatHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

export const initChat = (inventory: Ingredient[], user: UserProfile) => {
  const context = `You are KitchenWiz AI, a helpful kitchen assistant. 
  The user has these ingredients: ${inventory.map(i => i.name).join(', ') || 'None yet'}.
  User profile: ${JSON.stringify(user)}.
  Help them with cooking tips, recipes, meal planning, and food-related questions.
  Keep responses concise and helpful.`;

  chatHistory = [
    { role: 'user', parts: [{ text: context }] },
    { role: 'model', parts: [{ text: "Hello! I'm your KitchenWiz AI assistant. I can help you with recipes, meal planning, cooking tips, and more. What would you like help with today?" }] },
  ];
};

export const sendChatMessage = async (message: string): Promise<string> => {
  try {
    const historyToSend = chatHistory;
    const result = await apiFetch<{ response: string }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ history: historyToSend, message }),
    });

    const response = typeof result?.response === 'string' ? result.response : '';

    // Update local history after successful send.
    chatHistory = [...chatHistory, { role: 'user', parts: [{ text: message }] }, { role: 'model', parts: [{ text: response }] }];

    return response || "Sorry, I couldn't process your message. Please try again.";
  } catch (error) {
    console.error('Chat Error:', error);
    return "Sorry, I couldn't process your message. Please try again.";
  }
};
