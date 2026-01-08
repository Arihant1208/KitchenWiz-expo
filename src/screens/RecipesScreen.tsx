import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Ingredient, Recipe, RecipeGenerationPreferences, UserProfile } from '../types';
import { Button } from '../components/Button';
import { generateRecipesFromInventory } from '../services/geminiService';
import { api } from '../services/api';

interface RecipesScreenProps {
  inventory: Ingredient[];
  user: UserProfile;
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  savedRecipes: Recipe[];
  setSavedRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
}

export const RecipesScreen: React.FC<RecipesScreenProps> = ({
  inventory,
  user,
  recipes,
  setRecipes,
  savedRecipes,
  setSavedRecipes,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [activeTab, setActiveTab] = useState<'discover' | 'saved'>('discover');
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const [prefs, setPrefs] = useState<RecipeGenerationPreferences>({
    servings: Math.max(1, user.householdSize || 1),
    maxTimeMinutes: Math.max(10, user.maxCookingTime || 60),
    mealType: 'any',
    cravings: '',
    mustIncludeIngredient: '',
  });

  const openGenerateModal = () => {
    if (inventory.length === 0) {
      alert('Add some ingredients to your inventory first!');
      return;
    }
    setPrefs(prev => ({
      ...prev,
      servings: Math.max(1, prev.servings || user.householdSize || 1),
      maxTimeMinutes: Math.max(10, prev.maxTimeMinutes || user.maxCookingTime || 60),
    }));
    setShowPrefsModal(true);
  };

  const runGenerate = async () => {
    setShowPrefsModal(false);
    setLoading(true);
    try {
      const result = await generateRecipesFromInventory(inventory, user, prefs);

      // Recipes get their IDs from the backend DB. Sync then reload so UI uses server IDs.
      const merged = [...result, ...recipes];
      await api.recipes.syncDiscovered(merged);
      const [freshDiscovered, freshSaved] = await Promise.all([
        api.recipes.getDiscovered(),
        api.recipes.getSaved(),
      ]);
      setRecipes(freshDiscovered);
      setSavedRecipes(freshSaved);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isRecipeSaved = (id: string) => savedRecipes.some(r => r.id === id);

  const toggleSave = async (recipe: Recipe) => {
    const isSaved = isRecipeSaved(recipe.id);
    try {
      if (isSaved) {
        await api.recipes.unsave(recipe.id);
      } else {
        await api.recipes.save(recipe.id);
      }

      const [freshDiscovered, freshSaved] = await Promise.all([
        api.recipes.getDiscovered(),
        api.recipes.getSaved(),
      ]);
      setRecipes(freshDiscovered);
      setSavedRecipes(freshSaved);
    } catch (e) {
      console.error(e);
      alert('Failed to update saved recipes.');
    }
  };

  const getRecipeChips = (recipe: Recipe) => {
    const chips: Array<{ label: string; icon: keyof typeof Ionicons.glyphMap }> = [];
    const tags = (recipe.tags || []).filter(Boolean).slice(0, 2);

    tags.forEach(tag => {
      chips.push({ label: tag, icon: 'pricetag-outline' });
    });

    if (recipe.ingredients?.length) {
      chips.push({ label: `${recipe.ingredients.length} ingredients`, icon: 'list-outline' });
    }

    return chips;
  };

  // Recipe Detail View
  if (selectedRecipe) {
    const isSaved = isRecipeSaved(selectedRecipe.id);
    const chips = getRecipeChips(selectedRecipe);
    return (
      <ScrollView style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedRecipe(null)}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
          <Text style={styles.backText}>Back to Recipes</Text>
        </TouchableOpacity>

        <View style={styles.detailCard}>
          <Image
            source={{ uri: `https://picsum.photos/seed/${selectedRecipe.id}/800/400` }}
            style={styles.detailImage}
          />

          <View style={styles.detailBadge}>
            <Text style={styles.detailBadgeText}>
              {selectedRecipe.matchScore ? `${selectedRecipe.matchScore}% Match` : 'Recipe'}
            </Text>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={() => toggleSave(selectedRecipe)}>
            <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={24} color={Colors.error} />
          </TouchableOpacity>

          <View style={styles.detailContent}>
            <Text style={styles.detailTitle}>{selectedRecipe.title}</Text>

            <View style={styles.detailMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.metaText}>
                  {(selectedRecipe.prepTime || 0) + (selectedRecipe.cookTime || 0) || 30}m
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="flame-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{selectedRecipe.calories || 400} kcal</Text>
              </View>
            </View>

            {chips.length > 0 && (
              <View style={styles.chipRow}>
                {chips.map(chip => (
                  <View key={chip.label} style={styles.chip}>
                    <Ionicons name={chip.icon} size={14} color={Colors.textSecondary} />
                    <Text style={styles.chipText}>{chip.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {selectedRecipe.description && (
              <Text style={styles.detailDescription}>{selectedRecipe.description}</Text>
            )}

            {selectedRecipe.ingredients && (
              <View style={styles.ingredientsCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="restaurant-outline" size={18} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>Ingredients</Text>
                </View>
                {selectedRecipe.ingredients.map((ing, idx) => (
                  <View key={idx} style={styles.ingredientRow}>
                    <Text style={styles.ingredientName}>{ing.name}</Text>
                    <Text style={styles.ingredientAmount}>{ing.amount}</Text>
                  </View>
                ))}
              </View>
            )}

            {selectedRecipe.instructions && (
              <View style={styles.instructionsSection}>
                <Text style={styles.sectionTitle}>Instructions</Text>
                {selectedRecipe.instructions.map((step, idx) => (
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
    );
  }

  const recipesToDisplay = activeTab === 'discover' ? recipes : savedRecipes;

  const renderRecipeCard = ({ item }: { item: Recipe }) => {
    const isSaved = isRecipeSaved(item.id);
    const chips = getRecipeChips(item);
    const totalTime = (item.prepTime || 0) + (item.cookTime || 0) || 30;
    return (
      <TouchableOpacity style={styles.recipeCard} onPress={() => setSelectedRecipe(item)}>
        <Image
          source={{ uri: `https://picsum.photos/seed/${item.id}/200/200` }}
          style={styles.recipeImage}
        />
        <View style={styles.recipeContent}>
          <Text style={styles.recipeTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.recipeMeta}>
            <View style={styles.recipeMetaItem}>
              <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.recipeMetaText}>{totalTime}m</Text>
            </View>
            <View style={styles.recipeMetaItem}>
              <Ionicons name="flame-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.recipeMetaText}>{item.calories || 400} kcal</Text>
            </View>
          </View>
          {item.matchScore && (
            <View style={styles.matchBadge}>
              <Ionicons name="sparkles" size={12} color={Colors.primary} />
              <Text style={styles.matchText}>{item.matchScore}% Match</Text>
            </View>
          )}

          {chips.length > 0 && (
            <View style={styles.chipRowCompact}>
              {chips.map(chip => (
                <View key={chip.label} style={styles.chipCompact}>
                  <Ionicons name={chip.icon} size={12} color={Colors.textSecondary} />
                  <Text style={styles.chipTextCompact} numberOfLines={1}>
                    {chip.label}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.cardSaveBtn} onPress={() => toggleSave(item)}>
          <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={20} color={Colors.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Preferences Modal */}
      <Modal visible={showPrefsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="options-outline" size={20} color={Colors.primary} />
                <Text style={styles.modalTitle}>Recipe Preferences</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPrefsModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.prefCard}>
                <View style={styles.prefLabelRow}>
                  <Ionicons name="restaurant-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.prefLabel}>Meal type</Text>
                </View>
                <View style={styles.mealTypeRow}>
                  {(['any', 'breakfast', 'lunch', 'dinner', 'snack', 'dessert'] as const).map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.mealTypeChip, prefs.mealType === type && styles.mealTypeChipActive]}
                      activeOpacity={0.85}
                      onPress={() => setPrefs(p => ({ ...p, mealType: type }))}
                    >
                      <Text style={[styles.mealTypeText, prefs.mealType === type && styles.mealTypeTextActive]}>
                        {type === 'any' ? 'Any' : type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.prefCard}>
                <View style={styles.prefLabelRow}>
                  <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.prefLabel}>Number of people</Text>
                </View>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setPrefs(p => ({ ...p, servings: Math.max(1, p.servings - 1) }))}
                  >
                    <Ionicons name="remove" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{prefs.servings}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setPrefs(p => ({ ...p, servings: p.servings + 1 }))}
                  >
                    <Ionicons name="add" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.prefCard}>
                <View style={styles.prefLabelRow}>
                  <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.prefLabel}>Max time (minutes)</Text>
                </View>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setPrefs(p => ({ ...p, maxTimeMinutes: Math.max(10, p.maxTimeMinutes - 10) }))}
                  >
                    <Ionicons name="remove" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{prefs.maxTimeMinutes}m</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setPrefs(p => ({ ...p, maxTimeMinutes: Math.min(240, p.maxTimeMinutes + 10) }))}
                  >
                    <Ionicons name="add" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.prefCard}>
                <View style={styles.prefLabelRow}>
                  <Ionicons name="happy-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.prefLabel}>Cravings / mood</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={prefs.cravings || ''}
                  onChangeText={text => setPrefs(p => ({ ...p, cravings: text }))}
                  placeholder="e.g., spicy, comfort food, high-protein"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              <View style={styles.prefCard}>
                <View style={styles.prefLabelRow}>
                  <Ionicons name="leaf-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.prefLabel}>Specific ingredient (optional)</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={prefs.mustIncludeIngredient || ''}
                  onChangeText={text => setPrefs(p => ({ ...p, mustIncludeIngredient: text }))}
                  placeholder="e.g., chicken, paneer, mushrooms"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              <View style={styles.modalButtonRow}>
                <Button variant="outline" onPress={() => setShowPrefsModal(false)} style={styles.modalBtn}>
                  Cancel
                </Button>
                <Button onPress={runGenerate} style={styles.modalBtn} isLoading={loading}>
                  <Ionicons name="sparkles" size={16} color={Colors.textInverse} /> Generate
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Recipes</Text>
        {activeTab === 'discover' && (
          <Button onPress={openGenerateModal} size="sm" isLoading={loading}>
            <Ionicons name="sparkles" size={16} color="#fff" /> Generate
          </Button>
        )}
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>Discover</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'saved' && styles.tabActive]}
          onPress={() => setActiveTab('saved')}
        >
          <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>
            Saved ({savedRecipes.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recipe List */}
      <FlatList
        data={recipesToDisplay}
        keyExtractor={item => item.id}
        renderItem={renderRecipeCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={activeTab === 'discover' ? 'restaurant-outline' : 'heart-outline'}
              size={48}
              color={Colors.textMuted}
            />
            <Text style={styles.emptyText}>
              {activeTab === 'discover' ? 'Hungry?' : 'No saved recipes yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'discover'
                ? 'Tap Generate to get AI recipes based on your kitchen!'
                : 'Discover recipes and save your favorites.'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  modalBody: {
    padding: 20,
  },
  prefCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Colors.shadow.small,
  },
  prefLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  prefLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  mealTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mealTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.borderLight,
  },
  mealTypeChipActive: {
    backgroundColor: Colors.primaryLight,
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  mealTypeTextActive: {
    color: Colors.primary,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  modalBtn: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: Colors.surface,
    ...Colors.shadow.small,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    ...Colors.shadow.medium,
  },
  recipeImage: {
    width: 110,
    height: 110,
  },
  recipeContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  recipeTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  recipeMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recipeMetaText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  matchBadge: {
    marginTop: 10,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  cardSaveBtn: {
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 21,
  },
  // Detail View
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  backText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  detailCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    ...Colors.shadow.large,
  },
  detailImage: {
    width: '100%',
    height: 220,
  },
  detailBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    ...Colors.shadow.small,
  },
  detailBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  saveButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 12,
    borderRadius: 14,
    ...Colors.shadow.small,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  chipRowCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chipCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: '100%',
  },
  chipTextCompact: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
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
