import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Ingredient, Recipe, MealPlanDay, UserProfile } from '../types';

const { width } = Dimensions.get('window');
const RECIPE_CARD_WIDTH = width * 0.7;
const SMALL_RECIPE_WIDTH = (width - 48) / 2;

interface HomeScreenProps {
  inventory: Ingredient[];
  recipes: Recipe[];
  savedRecipes: Recipe[];
  mealPlan: MealPlanDay[];
  user: UserProfile;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  inventory,
  recipes,
  savedRecipes,
  mealPlan,
  user,
}) => {
  const navigation = useNavigation<any>();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get top recommended recipes (highest match score)
  const topRecommended = [...recipes]
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
    .slice(0, 5);

  // Quick recipes (under 30 min)
  const quickRecipes = recipes
    .filter(r => ((r.prepTime || 0) + (r.cookTime || 0)) <= 30)
    .slice(0, 4);

  // Expiring ingredients count
  const expiringCount = inventory.filter(i => {
    const diff = new Date(i.expiryDate).getTime() - Date.now();
    return diff < 1000 * 3600 * 24 * 3 && diff > 0;
  }).length;

  // Expiring ingredients for recipe suggestions
  const expiringIngredients = inventory
    .filter(i => {
      const diff = new Date(i.expiryDate).getTime() - Date.now();
      return diff < 1000 * 3600 * 24 * 3 && diff > 0;
    })
    .slice(0, 3);

  const navigateToRecipeDetail = (recipe: Recipe) => {
    const isSaved = savedRecipes.some(r => r.id === recipe.id);
    navigation.navigate('RecipeDetail', { recipe, isSaved });
  };

  const renderFeaturedRecipe = ({ item, index }: { item: Recipe; index: number }) => (
    <TouchableOpacity
      style={[styles.featuredCard, index === 0 && { marginLeft: 16 }]}
      activeOpacity={0.9}
      onPress={() => navigateToRecipeDetail(item)}
    >
      <Image
        source={{ uri: `https://picsum.photos/seed/${item.id}/400/250` }}
        style={styles.featuredImage}
      />
      <View style={styles.featuredOverlay} />
      <View style={styles.featuredContent}>
        {item.matchScore !== undefined && item.matchScore > 0 && (
          <View style={styles.matchBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#fff" />
            <Text style={styles.matchText}>{item.matchScore}% match</Text>
          </View>
        )}
        <Text style={styles.featuredTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.featuredMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#fff" />
            <Text style={styles.metaText}>
              {(item.prepTime || 0) + (item.cookTime || 0)} min
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="flame-outline" size={14} color="#fff" />
            <Text style={styles.metaText}>{item.calories || '—'} cal</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.saveButton}>
        <Ionicons
          name={savedRecipes.some(r => r.id === item.id) ? 'heart' : 'heart-outline'}
          size={20}
          color={savedRecipes.some(r => r.id === item.id) ? Colors.error : '#fff'}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSmallRecipe = (recipe: Recipe) => (
    <TouchableOpacity
      key={recipe.id}
      style={styles.smallRecipeCard}
      activeOpacity={0.8}
      onPress={() => navigateToRecipeDetail(recipe)}
    >
      <Image
        source={{ uri: `https://picsum.photos/seed/${recipe.id}/200/150` }}
        style={styles.smallRecipeImage}
      />
      <View style={styles.smallRecipeContent}>
        <Text style={styles.smallRecipeTitle} numberOfLines={2}>{recipe.title}</Text>
        <View style={styles.smallRecipeMeta}>
          <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.smallRecipeMetaText}>
            {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user.name || 'Chef'} 👨‍🍳</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('SavedRecipes')}
            >
              <Ionicons name="heart" size={22} color={Colors.error} />
              {savedRecipes.length > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{savedRecipes.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Ionicons name="person-circle-outline" size={28} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Generate Recipes CTA */}
        <TouchableOpacity
          style={styles.generateCTA}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Recipes')}
        >
          <View style={styles.generateContent}>
            <View style={styles.generateIcon}>
              <Ionicons name="sparkles" size={24} color="#fff" />
            </View>
            <View style={styles.generateText}>
              <Text style={styles.generateTitle}>Discover New Recipes</Text>
              <Text style={styles.generateSubtitle}>
                {inventory.length > 0
                  ? `Based on your ${inventory.length} ingredients`
                  : 'Add ingredients to get personalized suggestions'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Expiring Ingredients Alert */}
        {expiringCount > 0 && (
          <TouchableOpacity
            style={styles.expiringAlert}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Recipes')}
          >
            <View style={styles.expiringIcon}>
              <Ionicons name="warning" size={18} color={Colors.warning} />
            </View>
            <View style={styles.expiringContent}>
              <Text style={styles.expiringTitle}>
                {expiringCount} ingredient{expiringCount > 1 ? 's' : ''} expiring soon
              </Text>
              <Text style={styles.expiringText}>
                {expiringIngredients.map(i => i.name).join(', ')}
                {expiringIngredients.length < expiringCount && '...'}
              </Text>
            </View>
            <Text style={styles.expiringAction}>Use them →</Text>
          </TouchableOpacity>
        )}

        {/* Top Recommended Recipes */}
        {topRecommended.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Recommended for You</Text>
                <Text style={styles.sectionSubtitle}>Based on your inventory</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Recipes')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={topRecommended}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id}
              renderItem={renderFeaturedRecipe}
              contentContainerStyle={styles.featuredList}
              snapToInterval={RECIPE_CARD_WIDTH + 12}
              decelerationRate="fast"
            />
          </View>
        )}

        {/* Quick & Easy Section */}
        {quickRecipes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Quick & Easy</Text>
                <Text style={styles.sectionSubtitle}>Ready in 30 minutes or less</Text>
              </View>
            </View>
            <View style={styles.smallRecipeGrid}>
              {quickRecipes.map(renderSmallRecipe)}
            </View>
          </View>
        )}

        {/* Empty State - No Recipes */}
        {recipes.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="restaurant-outline" size={48} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Recipes Yet</Text>
            <Text style={styles.emptyText}>
              Add ingredients to your inventory and we'll suggest delicious recipes you can make!
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('Inventory')}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Add Ingredients</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Saved Recipes Preview */}
        {savedRecipes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Your Favorites</Text>
                <Text style={styles.sectionSubtitle}>{savedRecipes.length} saved recipes</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('SavedRecipes')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.savedScrollContent}
            >
              {savedRecipes.slice(0, 4).map(recipe => (
                <TouchableOpacity
                  key={recipe.id}
                  style={styles.savedRecipeCard}
                  activeOpacity={0.8}
                  onPress={() => navigateToRecipeDetail(recipe)}
                >
                  <Image
                    source={{ uri: `https://picsum.photos/seed/${recipe.id}/150/150` }}
                    style={styles.savedRecipeImage}
                  />
                  <View style={styles.savedHeart}>
                    <Ionicons name="heart" size={12} color={Colors.error} />
                  </View>
                  <Text style={styles.savedRecipeTitle} numberOfLines={2}>{recipe.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick Actions Row */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitleSmall}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Inventory')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#ecfdf5' }]}>
                <Ionicons name="cube-outline" size={22} color="#10b981" />
              </View>
              <Text style={styles.quickActionLabel}>Inventory</Text>
              <Text style={styles.quickActionSub}>{inventory.length} items</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Planner')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="calendar-outline" size={22} color="#3b82f6" />
              </View>
              <Text style={styles.quickActionLabel}>Meal Plan</Text>
              <Text style={styles.quickActionSub}>{mealPlan.length > 0 ? 'View plan' : 'Create'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Assistant')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color="#f59e0b" />
              </View>
              <Text style={styles.quickActionLabel}>AI Chef</Text>
              <Text style={styles.quickActionSub}>Ask anything</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('ShoppingList')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#fce7f3' }]}>
                <Ionicons name="cart-outline" size={22} color="#ec4899" />
              </View>
              <Text style={styles.quickActionLabel}>Shopping</Text>
              <Text style={styles.quickActionSub}>List</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 6,
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  generateCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Colors.shadow.medium,
  },
  generateContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  generateIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  generateText: {
    flex: 1,
  },
  generateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  generateSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  expiringAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningLight,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  expiringIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expiringContent: {
    flex: 1,
  },
  expiringTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  expiringText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  expiringAction: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.warning,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionTitleSmall: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  featuredList: {
    paddingRight: 16,
  },
  featuredCard: {
    width: RECIPE_CARD_WIDTH,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
    ...Colors.shadow.medium,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.borderLight,
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  featuredContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 4,
  },
  matchText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  featuredTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  featuredMeta: {
    flexDirection: 'row',
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  saveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallRecipeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  smallRecipeCard: {
    width: SMALL_RECIPE_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    ...Colors.shadow.small,
  },
  smallRecipeImage: {
    width: '100%',
    height: 100,
    backgroundColor: Colors.borderLight,
  },
  smallRecipeContent: {
    padding: 10,
  },
  smallRecipeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
    lineHeight: 18,
  },
  smallRecipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  smallRecipeMetaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  savedScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  savedRecipeCard: {
    width: 110,
    alignItems: 'center',
  },
  savedRecipeImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.borderLight,
    marginBottom: 8,
  },
  savedHeart: {
    position: 'absolute',
    top: 0,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Colors.shadow.small,
  },
  savedRecipeTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    ...Colors.shadow.small,
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
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  quickActionsSection: {
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  quickAction: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    ...Colors.shadow.small,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  quickActionSub: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
});
