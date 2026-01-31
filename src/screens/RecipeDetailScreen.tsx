import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Recipe } from '../types';
import { api } from '../services/api';

const { width } = Dimensions.get('window');

type RouteParams = {
  RecipeDetail: {
    recipe: Recipe;
    isSaved?: boolean;
  };
};

interface RecipeDetailScreenProps {
  savedRecipes: Recipe[];
  setSavedRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
}

export const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({
  savedRecipes,
  setSavedRecipes,
  setRecipes,
}) => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'RecipeDetail'>>();
  const { recipe } = route.params;

  const [isSaving, setIsSaving] = useState(false);
  const isSaved = savedRecipes.some(r => r.id === recipe.id);

  const toggleSave = async () => {
    setIsSaving(true);
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
      Alert.alert('Error', 'Failed to update saved recipes');
    } finally {
      setIsSaving(false);
    }
  };

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0) || 30;

  return (
    <View style={styles.container}>
      {/* Hero Image with overlay */}
      <View style={styles.heroContainer}>
        <Image
          source={{ uri: `https://picsum.photos/seed/${recipe.id}/800/600` }}
          style={styles.heroImage}
        />
        <View style={styles.heroOverlay} />

        <SafeAreaView style={styles.heroNav} edges={['top']}>
          <TouchableOpacity style={styles.navButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navButton}
            onPress={toggleSave}
            disabled={isSaving}
          >
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={24}
              color={isSaved ? Colors.error : '#fff'}
            />
          </TouchableOpacity>
        </SafeAreaView>

        {recipe.matchScore && (
          <View style={styles.matchBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.matchBadgeText}>{recipe.matchScore}% Match</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Meta */}
        <Text style={styles.title}>{recipe.title}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={18} color={Colors.primary} />
            <View style={styles.metaTextGroup}>
              <Text style={styles.metaValue}>{totalTime}</Text>
              <Text style={styles.metaLabel}>mins</Text>
            </View>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Ionicons name="flame-outline" size={18} color={Colors.warning} />
            <View style={styles.metaTextGroup}>
              <Text style={styles.metaValue}>{recipe.calories || 400}</Text>
              <Text style={styles.metaLabel}>kcal</Text>
            </View>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Ionicons name="restaurant-outline" size={18} color={Colors.info} />
            <View style={styles.metaTextGroup}>
              <Text style={styles.metaValue}>{recipe.ingredients?.length || 0}</Text>
              <Text style={styles.metaLabel}>items</Text>
            </View>
          </View>
        </View>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {recipe.tags.map(tag => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Description */}
        {recipe.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{recipe.description}</Text>
          </View>
        )}

        {/* Ingredients */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <Text style={styles.sectionCount}>{recipe.ingredients.length} items</Text>
            </View>
            <View style={styles.ingredientsList}>
              {recipe.ingredients.map((ing, idx) => (
                <View key={idx} style={styles.ingredientItem}>
                  <View style={styles.ingredientBullet} />
                  <Text style={styles.ingredientName}>{ing.name}</Text>
                  <Text style={styles.ingredientAmount}>{ing.amount}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Instructions */}
        {recipe.instructions && recipe.instructions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              <Text style={styles.sectionCount}>{recipe.instructions.length} steps</Text>
            </View>
            <View style={styles.instructionsList}>
              {recipe.instructions.map((step, idx) => (
                <View key={idx} style={styles.instructionItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroContainer: {
    height: 280,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.borderLight,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  heroNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  matchBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    marginTop: -24,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    ...Colors.shadow.small,
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  metaTextGroup: {
    alignItems: 'center',
  },
  metaValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  metaLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  metaDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primaryDark,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionCount: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: 8,
  },
  ingredientsList: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    ...Colors.shadow.small,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  ingredientBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: 12,
  },
  ingredientName: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  ingredientAmount: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  instructionsList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    paddingTop: 4,
  },
  bottomSpacer: {
    height: 40,
  },
});
