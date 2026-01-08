import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { DashboardScreen } from './src/screens/DashboardScreen';
import { InventoryScreen } from './src/screens/InventoryScreen';
import { RecipesScreen } from './src/screens/RecipesScreen';
import { PlannerScreen } from './src/screens/PlannerScreen';
import { AssistantScreen } from './src/screens/AssistantScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AuthScreen } from './src/screens/AuthScreen';

import { Ingredient, UserProfile, MealPlanDay, Recipe, ShoppingItem, AuthSession } from './src/types';
import { storage } from './src/services/storage';
import { CustomTabBar } from './src/components/CustomTabBar';
import { api, authEvents, authTokenStore } from './src/services/api';
import { useAuthRefresh } from './src/services/useAuthRefresh';
import { Colors } from './src/constants/colors';

const Tab = createBottomTabNavigator();

const DEFAULT_USER: UserProfile = {
  name: '',
  dietaryRestrictions: [],
  allergies: [],
  goals: 'maintenance',
  cookingSkill: 'intermediate',
  householdSize: 1,
  cuisinePreferences: [],
  maxCookingTime: 60,
};

export default function App() {
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  const [inventory, setInventory] = useState<Ingredient[]>([]);
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [mealPlan, setMealPlan] = useState<MealPlanDay[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [authSession, setAuthSession] = useState<AuthSession>({ mode: 'guest' });

  // Set up automatic token refresh
  useAuthRefresh({
    accessToken: authSession.mode === 'signed-in' ? authSession.accessToken : undefined,
    refreshToken: authSession.mode === 'signed-in' ? authSession.refreshToken : undefined,
    onTokenRefreshed: (tokens) => {
      // Update session with new tokens
      if (authSession.mode === 'signed-in') {
        setAuthSession({
          ...authSession,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      }
    },
    onAuthError: () => {
      // Token refresh failed - sign out user
      console.warn('Token refresh failed, signing out');
      setAuthSession({ mode: 'guest' });
    },
  });

  useEffect(() => {
    const unsubscribe = authEvents.onAuthExpired(() => {
      console.warn('Auth expired, signing out');
      setAuthSession({ mode: 'guest' });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedAuth = await storage.auth.get();
        setAuthSession(storedAuth);
      } catch (error) {
        console.error('Failed to load auth session:', error);
      } finally {
        setIsAuthLoading(false);
      }
    };
    loadAuth();
  }, []);

  useEffect(() => {
    if (!isAuthLoading) storage.auth.save(authSession);
  }, [authSession, isAuthLoading]);

  useEffect(() => { if (!isDataLoading) storage.inventory.save(inventory); }, [inventory, isDataLoading]);
  useEffect(() => { if (!isDataLoading) storage.user.save(user); }, [user, isDataLoading]);
  useEffect(() => { if (!isDataLoading) storage.mealPlan.save(mealPlan); }, [mealPlan, isDataLoading]);
  useEffect(() => { if (!isDataLoading) storage.recipes.save(recipes); }, [recipes, isDataLoading]);
  useEffect(() => { if (!isDataLoading) storage.savedRecipes.save(savedRecipes); }, [savedRecipes, isDataLoading]);
  useEffect(() => { if (!isDataLoading) storage.shoppingList.save(shoppingList); }, [shoppingList, isDataLoading]);

  useEffect(() => {
    if (authSession.mode === 'signed-in' && authSession.accessToken && authSession.refreshToken) {
      authTokenStore.setTokens({ accessToken: authSession.accessToken, refreshToken: authSession.refreshToken });
    } else {
      authTokenStore.clear();
    }
  }, [authSession]);

  useEffect(() => {
    const loadAppData = async () => {
      if (authSession.mode !== 'signed-in') {
        setIsDataLoading(true);
        setInventory([]);
        setMealPlan([]);
        setRecipes([]);
        setSavedRecipes([]);
        setShoppingList([]);
        setUser(DEFAULT_USER);
        return;
      }

      setIsDataLoading(true);
      try {
        // Prefer backend as the source of truth for signed-in users.
        const [remoteInventory, remoteUser, remoteMealPlan, remoteDiscoveredRecipes, remoteSavedRecipes, remoteShopping] =
          await Promise.all([
            api.inventory.getAll(),
            api.user.get(),
            api.mealPlan.get(),
            api.recipes.getDiscovered(),
            api.recipes.getSaved(),
            api.shoppingList.getAll(),
          ]);

        const remoteIsEmpty =
          remoteInventory.length === 0 &&
          remoteMealPlan.length === 0 &&
          remoteDiscoveredRecipes.length === 0 &&
          remoteSavedRecipes.length === 0 &&
          remoteShopping.length === 0;

        // If the backend is empty but local storage has data (from older builds), migrate it once.
        if (remoteIsEmpty) {
          const [localInventory, localUser, localMealPlan, localRecipes, localSaved, localShopping] = await Promise.all([
            storage.inventory.get(),
            storage.user.get(),
            storage.mealPlan.get(),
            storage.recipes.get(),
            storage.savedRecipes.get(),
            storage.shoppingList.get(),
          ]);

          const hasLocalData =
            localInventory.length > 0 ||
            localMealPlan.length > 0 ||
            localRecipes.length > 0 ||
            localSaved.length > 0 ||
            localShopping.length > 0;

          if (hasLocalData) {
            // Inventory + shopping list have per-item endpoints; recipes/mealplan are sync-based.
            await Promise.all([
              localInventory.length > 0
                ? Promise.all(localInventory.map(item => api.inventory.add(item))).then(() => undefined)
                : Promise.resolve(),
              localShopping.length > 0 ? api.shoppingList.sync(localShopping) : Promise.resolve(),
              localMealPlan.length > 0 ? api.mealPlan.sync(localMealPlan) : Promise.resolve(),
              localRecipes.length > 0 ? api.recipes.syncDiscovered(localRecipes) : Promise.resolve(),
              localSaved.length > 0 ? api.recipes.syncSaved(localSaved) : Promise.resolve(),
              api.user.update(localUser).catch(() => undefined),
            ]);

            const [mInv, mUser, mPlan, mDisc, mSaved, mShop] = await Promise.all([
              api.inventory.getAll(),
              api.user.get(),
              api.mealPlan.get(),
              api.recipes.getDiscovered(),
              api.recipes.getSaved(),
              api.shoppingList.getAll(),
            ]);

            setInventory(mInv);
            setUser(mUser ?? DEFAULT_USER);
            setMealPlan(mPlan);
            setRecipes(mDisc);
            setSavedRecipes(mSaved);
            setShoppingList(mShop);
            return;
          }
        }

        setInventory(remoteInventory);
        setUser(remoteUser ?? DEFAULT_USER);
        setMealPlan(remoteMealPlan);
        setRecipes(remoteDiscoveredRecipes);
        setSavedRecipes(remoteSavedRecipes);
        setShoppingList(remoteShopping);
      } catch (error) {
        console.error('Failed to load app data:', error);
        // Fallback to local cache so the app still works if the backend is unreachable.
        try {
          const [storedInventory, storedUser, storedMealPlan, storedRecipes, storedSavedRecipes, storedShoppingList] =
            await Promise.all([
              storage.inventory.get(),
              storage.user.get(),
              storage.mealPlan.get(),
              storage.recipes.get(),
              storage.savedRecipes.get(),
              storage.shoppingList.get(),
            ]);

          setInventory(storedInventory);
          setUser(storedUser);
          setMealPlan(storedMealPlan);
          setRecipes(storedRecipes);
          setSavedRecipes(storedSavedRecipes);
          setShoppingList(storedShoppingList);
        } catch (fallbackErr) {
          console.error('Failed to load fallback local cache:', fallbackErr);
        }
      } finally {
        setIsDataLoading(false);
      }
    };

    if (!isAuthLoading) loadAppData();
  }, [authSession.mode, isAuthLoading]);

  if (isAuthLoading) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  if (authSession.mode !== 'signed-in') {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthScreen
          onSignedIn={(session: AuthSession) => setAuthSession(session)}
        />
      </SafeAreaProvider>
    );
  }

  if (isDataLoading) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          tabBar={props => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tab.Screen name="Dashboard">{() => <DashboardScreen inventory={inventory} />}</Tab.Screen>
          <Tab.Screen name="Inventory">{() => <InventoryScreen items={inventory} setItems={setInventory} shoppingList={shoppingList} setShoppingList={setShoppingList} mealPlan={mealPlan} />}</Tab.Screen>
          <Tab.Screen name="Recipes">{() => <RecipesScreen inventory={inventory} user={user} recipes={recipes} setRecipes={setRecipes} savedRecipes={savedRecipes} setSavedRecipes={setSavedRecipes} />}</Tab.Screen>
          <Tab.Screen name="Planner">{() => <PlannerScreen user={user} inventory={inventory} mealPlan={mealPlan} setMealPlan={setMealPlan} />}</Tab.Screen>
          <Tab.Screen
            name="Assistant"
            options={{
              tabBarButton: () => null,
            }}
          >
            {() => <AssistantScreen inventory={inventory} user={user} />}
          </Tab.Screen>
          <Tab.Screen name="Profile">{() => <ProfileScreen user={user} setUser={setUser} authSession={authSession} setAuthSession={setAuthSession} />}</Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
