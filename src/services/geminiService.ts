import { GoogleGenerativeAI } from '@google/generative-ai';
import { Ingredient, Recipe, MealPlanDay, UserProfile, ShoppingItem, ChatMessage, RecipeGenerationPreferences } from '../types';

// Replace with your actual API key or use environment variables
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Helper to clean JSON string if Markdown code blocks are present
const cleanJson = (text: string) => {
  return text.replace(/```json\n?|\n?```/g, '').trim();
};

export const parseReceiptImage = async (base64Data: string, mimeType: string = 'image/jpeg'): Promise<Ingredient[]> => {
  try {
    const prompt = `Analyze this grocery receipt. Extract the items as ingredients. 
    For each item, determine a likely category (produce, dairy, meat, pantry, frozen, other), 
    a standard quantity (e.g., "1 unit", "500g"), and estimate an expiry date from today (YYYY-MM-DD) based on the type of food.
    Return ONLY a valid JSON array with objects containing: name, quantity, category, expiryDate, caloriesPerUnit (optional number).
    Categories must be one of: produce, dairy, meat, pantry, frozen, other.`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      },
      { text: prompt },
    ]);

    const text = result.response.text();
    const data = JSON.parse(cleanJson(text));
    
    return data.map((item: any) => ({
      ...item,
      id: Math.random().toString(36).substring(7),
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
  const inventoryList = inventory.map(i => `${i.quantity} ${i.name}`).join(', ');

  const servings = Math.max(1, Math.round(prefs?.servings ?? user.householdSize ?? 1));
  const maxTimeMinutes = Math.max(10, Math.round(prefs?.maxTimeMinutes ?? user.maxCookingTime ?? 60));
  const mealType = (prefs?.mealType || 'any').toString().trim() || 'any';
  const cravings = (prefs?.cravings || '').trim();
  const mustIncludeIngredient = (prefs?.mustIncludeIngredient || '').trim();

  const prompt = `
    I have these ingredients: ${inventoryList}.
    My profile: ${JSON.stringify(user)}.

    Recipe preferences:
    - Servings (number of people): ${servings}
    - Max total time (prep + cook): ${maxTimeMinutes} minutes
    - Meal type: ${mealType}
    - Cravings / mood: ${cravings || 'None specified'}
    - Must include this ingredient if possible: ${mustIncludeIngredient || 'None'}
    
    Suggest 3 creative recipes that prioritize using my existing stock to reduce waste.
    Take into account my cuisine preferences (${user.cuisinePreferences?.join(', ') || 'Any'}), dietary restrictions (${user.dietaryRestrictions?.join(', ') || 'None'}), and allergies (${user.allergies?.join(', ') || 'None'}).
    Keep each recipe within the max total time (${maxTimeMinutes} minutes).
    If a meal type is provided (not "any"), make recipes appropriate for that meal type.
    If a must-include ingredient is provided, include it in each recipe when reasonable.
    Rate each recipe with a 'matchScore' (0-100) based on how many ingredients I already have vs need to buy.

    In the 'tags' array, include helpful short tags such as: cuisine, meal type, "serves ${servings}", cravings keywords (if any), and dietary-friendly tags when appropriate.
    
    Return ONLY a valid JSON array with objects containing:
    - title (string)
    - description (string)
    - ingredients (array of {name: string, amount: string})
    - instructions (array of strings)
    - prepTime (number in minutes)
    - cookTime (number in minutes)
    - calories (number)
    - matchScore (number 0-100)
    - tags (array of strings)
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const recipes = JSON.parse(cleanJson(text));
    
    return recipes.map((r: any) => ({ 
      ...r, 
      id: Math.random().toString(36).substring(7) 
    }));
  } catch (error) {
    console.error('Recipe Gen Error:', error);
    return [];
  }
};

export const generateWeeklyMealPlan = async (user: UserProfile, inventory: Ingredient[]): Promise<MealPlanDay[]> => {
  const inventoryList = inventory.map(i => i.name).join(', ');
  
  const prompt = `
    Create a 7-day meal plan (Monday to Sunday) for a user with these attributes:
    - Goals: ${user.goals}
    - Diet: ${user.dietaryRestrictions.join(', ') || 'None'}
    - Cuisines: ${user.cuisinePreferences?.join(', ') || 'Any'}
    - Max Cooking Time: ${user.maxCookingTime || 60} minutes per meal
    
    Available Ingredients: ${inventoryList || 'None specified'}.
    Prioritize using available ingredients to reduce waste.
    
    Return ONLY a valid JSON array with 7 objects containing:
    - day (string: Monday, Tuesday, etc.)
    - breakfast (object with: id, title, calories, prepTime, cookTime)
    - lunch (object with: id, title, calories, prepTime, cookTime)
    - dinner (object with: id, title, calories, prepTime, cookTime)
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const plan = JSON.parse(cleanJson(text));
    
    // Add IDs to meals
    return plan.map((day: any) => ({
      ...day,
      breakfast: day.breakfast ? { ...day.breakfast, id: Math.random().toString(36).substring(7) } : undefined,
      lunch: day.lunch ? { ...day.lunch, id: Math.random().toString(36).substring(7) } : undefined,
      dinner: day.dinner ? { ...day.dinner, id: Math.random().toString(36).substring(7) } : undefined,
    }));
  } catch (error) {
    console.error('Meal Plan Error:', error);
    return [];
  }
};

export const generateShoppingList = async (inventory: Ingredient[], mealPlan: MealPlanDay[]): Promise<ShoppingItem[]> => {
  const inventoryList = inventory.map(i => i.name).join(', ');
  const meals = mealPlan.flatMap(d => [d.breakfast?.title, d.lunch?.title, d.dinner?.title]).filter(Boolean);

  const prompt = `
    Based on these planned meals: ${meals.join(', ')}
    And current inventory: ${inventoryList || 'Empty'}
    
    Generate a shopping list of items I need to buy.
    
    Return ONLY a valid JSON array with objects containing:
    - name (string)
    - quantity (string like "2 lbs", "1 dozen", etc.)
    - category (one of: produce, dairy, meat, pantry, frozen, other)
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const items = JSON.parse(cleanJson(text));
    
    return items.map((item: any) => ({
      ...item,
      id: Math.random().toString(36).substring(7),
      checked: false,
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
    chatHistory.push({ role: 'user', parts: [{ text: message }] });

    const chat = model.startChat({
      history: chatHistory,
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    chatHistory.push({ role: 'model', parts: [{ text: response }] });

    return response;
  } catch (error) {
    console.error('Chat Error:', error);
    return "Sorry, I couldn't process your message. Please try again.";
  }
};
