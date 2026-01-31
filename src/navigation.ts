import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Recipe } from './types';

export type RootStackParamList = {
  Home: undefined;
  Inventory: undefined;
  Recipes: undefined;
  SavedRecipes: undefined;
  RecipeDetail: { recipe: Recipe; isSaved: boolean };
  Planner: undefined;
  Assistant: undefined;
  Profile: undefined;
  Settings: undefined;
  ShoppingList: undefined;
};

export type NavigationProp<T extends keyof RootStackParamList> = NativeStackNavigationProp<RootStackParamList, T>;
export type ScreenRouteProp<T extends keyof RootStackParamList> = RouteProp<RootStackParamList, T>;
