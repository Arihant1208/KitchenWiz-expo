import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Recipe } from '../types';
import { api } from '../services/api';

interface SavedRecipesScreenProps {
  savedRecipes: Recipe[];
  setSavedRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
}

export const SavedRecipesScreen: React.FC<SavedRecipesScreenProps> = ({
  savedRecipes,
  setSavedRecipes,
  setRecipes,
}) => {
  const navigation = useNavigation<any>();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleUnsave = async (recipe: Recipe) => {
    setRemovingId(recipe.id);
    try {
      await api.recipes.unsave(recipe.id);
      const [freshDiscovered, freshSaved] = await Promise.all([
        api.recipes.getDiscovered(),
        api.recipes.getSaved(),
      ]);
      setRecipes(freshDiscovered);
      setSavedRecipes(freshSaved);
    } catch (e) {
      console.error(e);
    } finally {
      setRemovingId(null);
    }
  };

  const renderRecipe = ({ item }: { item: Recipe }) => {
    const totalTime = (item.prepTime || 0) + (item.cookTime || 0) || 30;

    return (
      <TouchableOpacity
        style={styles.recipeCard}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('RecipeDetail', { recipe: item })}
      >
        <Image
          source={{ uri: `https://picsum.photos/seed/${item.id}/400/200` }}
          style={styles.recipeImage}
        />
        <TouchableOpacity
          style={styles.heartButton}
          onPress={() => handleUnsave(item)}
          disabled={removingId === item.id}
        >
          <Ionicons
            name="heart"
            size={22}
            color={removingId === item.id ? Colors.textMuted : Colors.error}
          />
        </TouchableOpacity>
        <View style={styles.recipeContent}>
          <Text style={styles.recipeTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.recipeMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{totalTime}m</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="flame-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{item.calories || 400} cal</Text>
            </View>
            {item.matchScore && (
              <View style={[styles.metaItem, styles.matchBadge]}>
                <Text style={styles.matchText}>{item.matchScore}% match</Text>
              </View>
            )}
          </View>
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {item.tags.slice(0, 3).map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Saved Recipes</Text>
        <View style={styles.placeholder} />
      </View>

      {savedRecipes.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="heart-outline" size={48} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No Saved Recipes</Text>
          <Text style={styles.emptyText}>
            Save recipes you love to find them easily later
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('Recipes')}
          >
            <Text style={styles.emptyButtonText}>Discover Recipes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={savedRecipes}
          keyExtractor={item => item.id}
          renderItem={renderRecipe}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    width: 32,
  },
  list: {
    padding: 16,
    gap: 16,
  },
  recipeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    ...Colors.shadow.medium,
  },
  recipeImage: {
    width: '100%',
    height: 160,
    backgroundColor: Colors.borderLight,
  },
  heartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Colors.shadow.small,
  },
  recipeContent: {
    padding: 16,
  },
  recipeTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  matchBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  matchText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
