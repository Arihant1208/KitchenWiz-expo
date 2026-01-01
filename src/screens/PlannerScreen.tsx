import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Ingredient, MealPlanDay, UserProfile } from '../types';
import { Button } from '../components/Button';
import { generateWeeklyMealPlan } from '../services/geminiService';

interface PlannerScreenProps {
  user: UserProfile;
  inventory: Ingredient[];
  mealPlan: MealPlanDay[];
  setMealPlan: React.Dispatch<React.SetStateAction<MealPlanDay[]>>;
}

export const PlannerScreen: React.FC<PlannerScreenProps> = ({
  user,
  inventory,
  mealPlan,
  setMealPlan,
}) => {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const plan = await generateWeeklyMealPlan(user, inventory);
      if (plan.length > 0) {
        setMealPlan(plan);
        Alert.alert('Success', 'Your weekly meal plan is ready!');
      } else {
        Alert.alert('Error', 'Failed to generate meal plan. Please try again.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to generate meal plan.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getDayCalories = (day: MealPlanDay) => {
    return (
      (day.breakfast?.calories || 0) +
      (day.lunch?.calories || 0) +
      (day.dinner?.calories || 0)
    );
  };

  const MealCard = ({ meal, type }: { meal?: { title?: string; calories?: number; prepTime?: number; cookTime?: number }; type: string }) => (
    <View style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <Ionicons
          name={type === 'breakfast' ? 'sunny-outline' : type === 'lunch' ? 'partly-sunny-outline' : 'moon-outline'}
          size={16}
          color={Colors.primary}
        />
        <Text style={styles.mealType}>{type}</Text>
      </View>
      {meal?.title ? (
        <>
          <Text style={styles.mealTitle}>{meal.title}</Text>
          <View style={styles.mealMeta}>
            <Text style={styles.mealMetaText}>
              <Ionicons name="time-outline" size={12} /> {(meal.prepTime || 0) + (meal.cookTime || 0)}m
            </Text>
            <Text style={styles.mealMetaText}>
              <Ionicons name="flame-outline" size={12} /> {meal.calories || 0} kcal
            </Text>
          </View>
        </>
      ) : (
        <Text style={styles.noMeal}>No meal planned</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Meal Planner</Text>
          <Text style={styles.subtitle}>Plan your week ahead</Text>
        </View>
        <Button onPress={handleGenerate} size="sm" isLoading={loading}>
          <Ionicons name="sparkles" size={16} color="#fff" /> Generate
        </Button>
      </View>

      {mealPlan.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No Meal Plan Yet</Text>
          <Text style={styles.emptySubtext}>
            Generate a personalized weekly meal plan based on your preferences and inventory.
          </Text>
          <Button onPress={handleGenerate} isLoading={loading} style={styles.emptyButton}>
            <Ionicons name="sparkles" size={18} color="#fff" /> Generate Plan
          </Button>
        </View>
      ) : (
        <ScrollView style={styles.planContainer} contentContainerStyle={styles.planContent}>
          {mealPlan.map((day, index) => (
            <View key={day.day || index} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayName}>{day.day}</Text>
                <View style={styles.dayCalories}>
                  <Ionicons name="flame" size={14} color={Colors.warning} />
                  <Text style={styles.dayCaloriesText}>{getDayCalories(day)} kcal</Text>
                </View>
              </View>
              
              <View style={styles.mealsContainer}>
                <MealCard meal={day.breakfast} type="breakfast" />
                <MealCard meal={day.lunch} type="lunch" />
                <MealCard meal={day.dinner} type="dinner" />
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 28,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  emptyButton: {
    paddingHorizontal: 32,
  },
  planContainer: {
    flex: 1,
  },
  planContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  dayCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    ...Colors.shadow.medium,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dayName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  dayCalories: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  dayCaloriesText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
  },
  mealsContainer: {
    gap: 12,
  },
  mealCard: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 14,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  mealType: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mealTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  mealMeta: {
    flexDirection: 'row',
    gap: 14,
  },
  mealMetaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  noMeal: {
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
