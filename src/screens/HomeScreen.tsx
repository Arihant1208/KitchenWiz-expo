import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Ingredient, Recipe, MealPlanDay, UserProfile } from '../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface HomeScreenProps {
  inventory: Ingredient[];
  recipes: Recipe[];
  savedRecipes: Recipe[];
  mealPlan: MealPlanDay[];
  user: UserProfile;
}

type FeatureCard = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  route: string;
  badge?: string | number;
};

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

  const getTodayMeals = () => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return mealPlan.find(day => day.day === today);
  };

  const expiringCount = inventory.filter(i => {
    const diff = new Date(i.expiryDate).getTime() - Date.now();
    return diff < 1000 * 3600 * 24 * 3 && diff > 0;
  }).length;

  const todayMeals = getTodayMeals();
  const plannedMealsCount = todayMeals
    ? [todayMeals.breakfast, todayMeals.lunch, todayMeals.dinner].filter(Boolean).length
    : 0;

  const featureCards: FeatureCard[] = [
    {
      id: 'inventory',
      title: 'Inventory',
      subtitle: `${inventory.length} items`,
      icon: 'cube-outline',
      color: '#10b981',
      bgColor: '#ecfdf5',
      route: 'Inventory',
      badge: expiringCount > 0 ? expiringCount : undefined,
    },
    {
      id: 'recipes',
      title: 'Recipes',
      subtitle: `${recipes.length} discovered`,
      icon: 'restaurant-outline',
      color: '#f59e0b',
      bgColor: '#fffbeb',
      route: 'Recipes',
    },
    {
      id: 'planner',
      title: 'Meal Planner',
      subtitle: `${plannedMealsCount} meals today`,
      icon: 'calendar-outline',
      color: '#3b82f6',
      bgColor: '#eff6ff',
      route: 'Planner',
    },
    {
      id: 'saved',
      title: 'Saved Recipes',
      subtitle: `${savedRecipes.length} favorites`,
      icon: 'heart-outline',
      color: '#ef4444',
      bgColor: '#fef2f2',
      route: 'SavedRecipes',
    },
  ];

  const quickActions = [
    {
      id: 'scan',
      label: 'Scan Receipt',
      icon: 'scan-outline' as keyof typeof Ionicons.glyphMap,
      onPress: () => navigation.navigate('Inventory', { action: 'scan' }),
    },
    {
      id: 'generate',
      label: 'Generate Recipes',
      icon: 'sparkles-outline' as keyof typeof Ionicons.glyphMap,
      onPress: () => navigation.navigate('Recipes', { action: 'generate' }),
    },
    {
      id: 'assistant',
      label: 'AI Assistant',
      icon: 'chatbubble-ellipses-outline' as keyof typeof Ionicons.glyphMap,
      onPress: () => navigation.navigate('Assistant'),
    },
  ];

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
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.userName}>{user.name || 'Chef'}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-circle-outline" size={36} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Today's Summary Card */}
        {todayMeals && plannedMealsCount > 0 && (
          <TouchableOpacity
            style={styles.summaryCard}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Planner')}
          >
            <View style={styles.summaryCardGradient}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryIconBg}>
                  <Ionicons name="today-outline" size={20} color="#fff" />
                </View>
                <Text style={styles.summaryTitle}>Today's Plan</Text>
              </View>
              <View style={styles.mealsPreview}>
                {todayMeals.breakfast && (
                  <View style={styles.mealItem}>
                    <Text style={styles.mealTime}>Breakfast</Text>
                    <Text style={styles.mealName} numberOfLines={1}>
                      {todayMeals.breakfast.title}
                    </Text>
                  </View>
                )}
                {todayMeals.lunch && (
                  <View style={styles.mealItem}>
                    <Text style={styles.mealTime}>Lunch</Text>
                    <Text style={styles.mealName} numberOfLines={1}>
                      {todayMeals.lunch.title}
                    </Text>
                  </View>
                )}
                {todayMeals.dinner && (
                  <View style={styles.mealItem}>
                    <Text style={styles.mealTime}>Dinner</Text>
                    <Text style={styles.mealName} numberOfLines={1}>
                      {todayMeals.dinner.title}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          {quickActions.map(action => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickAction}
              activeOpacity={0.7}
              onPress={action.onPress}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name={action.icon} size={22} color={Colors.primary} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Feature Cards Grid */}
        <Text style={styles.sectionTitle}>Your Kitchen</Text>
        <View style={styles.cardsGrid}>
          {featureCards.map(card => (
            <TouchableOpacity
              key={card.id}
              style={[styles.featureCard, { backgroundColor: card.bgColor }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(card.route)}
            >
              {card.badge !== undefined && (
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>{card.badge}</Text>
                </View>
              )}
              <View style={[styles.cardIconBg, { backgroundColor: card.color }]}>
                <Ionicons name={card.icon} size={24} color="#fff" />
              </View>
              <Text style={[styles.cardTitle, { color: card.color }]}>{card.title}</Text>
              <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tips Section */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={20} color={Colors.warning} />
            <Text style={styles.tipsTitle}>Quick Tip</Text>
          </View>
          <Text style={styles.tipsText}>
            {expiringCount > 0
              ? `You have ${expiringCount} item${expiringCount > 1 ? 's' : ''} expiring soon. Generate recipes to use them up!`
              : inventory.length > 0
              ? 'Scan a receipt to quickly add items to your inventory.'
              : 'Start by adding items to your inventory or scanning a receipt.'}
          </Text>
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
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
  },
  profileButton: {
    padding: 4,
  },
  summaryCard: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    ...Colors.shadow.medium,
  },
  summaryCardGradient: {
    backgroundColor: Colors.primary,
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  mealsPreview: {
    gap: 12,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealTime: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    width: 70,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    flex: 1,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    marginBottom: 28,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    ...Colors.shadow.small,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  featureCard: {
    width: CARD_WIDTH,
    padding: 20,
    borderRadius: 20,
    position: 'relative',
    ...Colors.shadow.small,
  },
  cardBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  cardIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tipsCard: {
    backgroundColor: Colors.warningLight,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  tipsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
