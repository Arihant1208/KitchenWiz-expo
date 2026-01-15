import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Ingredient, MealPlanDay, UserProfile, Recipe } from '../types';
import { Button } from '../components/Button';
import { generateWeeklyMealPlan } from '../services/geminiService';
import { api } from '../services/api';

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
  const [selectedMeal, setSelectedMeal] = useState<Recipe | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const plan = await generateWeeklyMealPlan(user, inventory);
      if (plan.length > 0) {
        await api.mealPlan.sync(plan);
        const fresh = await api.mealPlan.get();
        setMealPlan(fresh);
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

  const MealCard = ({ meal, type, onPress }: { meal?: Recipe; type: string; onPress?: () => void }) => (
    <TouchableOpacity style={styles.mealCard} onPress={onPress} disabled={!meal}>
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
    </TouchableOpacity>
  );

  // Recipe Detail View
  if (selectedMeal) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView style={styles.scroll}>
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedMeal(null)}>
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.backText}>Back to Planner</Text>
          </TouchableOpacity>

          <View style={styles.detailCard}>
            <Image
              source={{ uri: `https://picsum.photos/seed/${selectedMeal.id}/800/400` }}
              style={styles.detailImage}
            />

            <View style={styles.detailContent}>
              <Text style={styles.detailTitle}>{selectedMeal.title}</Text>

              <View style={styles.detailMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.metaText}>
                    {(selectedMeal.prepTime || 0) + (selectedMeal.cookTime || 0) || 30}m
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="flame-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.metaText}>{selectedMeal.calories || 400} kcal</Text>
                </View>
              </View>

              {selectedMeal.description && (
                <Text style={styles.detailDescription}>{selectedMeal.description}</Text>
              )}

              {selectedMeal.ingredients && selectedMeal.ingredients.length > 0 && (
                <View style={styles.ingredientsCard}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="restaurant-outline" size={18} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>Ingredients</Text>
                  </View>
                  {selectedMeal.ingredients.map((ing, idx) => (
                    <View key={idx} style={styles.ingredientRow}>
                      <Text style={styles.ingredientName}>{ing.name}</Text>
                      <Text style={styles.ingredientAmount}>{ing.amount}</Text>
                    </View>
                  ))}
                </View>
              )}

              {selectedMeal.instructions && selectedMeal.instructions.length > 0 && (
                <View style={styles.instructionsSection}>
                  <Text style={styles.sectionTitle}>Instructions</Text>
                  {selectedMeal.instructions.map((step, idx) => (
                    <View key={idx} style={styles.instructionRow}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.instructionText}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
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
                <MealCard meal={day.breakfast} type="breakfast" onPress={() => day.breakfast && setSelectedMeal(day.breakfast)} />
                <MealCard meal={day.lunch} type="lunch" onPress={() => day.lunch && setSelectedMeal(day.lunch)} />
                <MealCard meal={day.dinner} type="dinner" onPress={() => day.dinner && setSelectedMeal(day.dinner)} />
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flex: 1,
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  detailCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    margin: 20,
    marginTop: 0,
    overflow: 'hidden',
    ...Colors.shadow.medium,
  },
  detailImage: {
    width: '100%',
    height: 200,
  },
  detailBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  detailBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  detailContent: {
    padding: 24,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  detailMeta: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 18,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  metaText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  detailDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  ingredientsCard: {
    backgroundColor: Colors.primaryLight,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.15)',
  },
  ingredientName: {
    fontSize: 15,
    color: Colors.primaryDark,
    fontWeight: '500',
  },
  ingredientAmount: {
    fontSize: 15,
    color: Colors.primaryDark,
    opacity: 0.7,
  },
  instructionsSection: {
    marginTop: 8,
  },
  instructionRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
});
