import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Ingredient } from '../types';

interface DashboardScreenProps {
  inventory: Ingredient[];
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ inventory }) => {
  const navigation = useNavigation<any>();

  // Calculate category distribution
  const categoryData = inventory.reduce((acc, item) => {
    const existing = acc.find(x => x.name === item.category);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: item.category, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const expiringItems = inventory.filter(i => {
    const diff = new Date(i.expiryDate).getTime() - new Date().getTime();
    return diff < (1000 * 3600 * 24 * 3) && diff > 0;
  });

  const expiredItems = inventory.filter(i => {
    const diff = new Date(i.expiryDate).getTime() - new Date().getTime();
    return diff <= 0;
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Header with greeting */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>{getGreeting()} 👋</Text>
          <Text style={styles.title}>Kitchen Overview</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="leaf" size={28} color={Colors.primary} />
        </View>
      </View>

      {/* Quick Stats Row */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={[styles.statCard, styles.statCardPrimary]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Inventory')}
        >
          <View style={styles.statIconContainer}>
            <Ionicons name="cube" size={22} color={Colors.textInverse} />
          </View>
          <Text style={styles.statValue}>{inventory.length}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, styles.statCardWarning]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Inventory')}
        >
          <View style={[styles.statIconContainer, styles.statIconWarning]}>
            <Ionicons name="time" size={22} color={Colors.warning} />
          </View>
          <Text style={[styles.statValue, styles.statValueDark]}>{expiringItems.length}</Text>
          <Text style={[styles.statLabel, styles.statLabelDark]}>Expiring Soon</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, styles.statCardError]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Inventory')}
        >
          <View style={[styles.statIconContainer, styles.statIconError]}>
            <Ionicons name="alert-circle" size={22} color={Colors.error} />
          </View>
          <Text style={[styles.statValue, styles.statValueDark]}>{expiredItems.length}</Text>
          <Text style={[styles.statLabel, styles.statLabelDark]}>Expired</Text>
        </TouchableOpacity>
      </View>

      {/* Category Distribution */}
      <TouchableOpacity
        style={styles.sectionCard}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('Inventory')}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBg}>
              <Ionicons name="pie-chart" size={16} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Inventory by Category</Text>
          </View>
          <Text style={styles.sectionSubtitle}>{categoryData.length} categories</Text>
        </View>
        
        {categoryData.length > 0 ? (
          <View style={styles.categoryList}>
            {categoryData.map((entry, index) => {
              const catColor = Colors.categories[entry.name as keyof typeof Colors.categories] || Colors.categories.other;
              const percentage = Math.round((entry.value / inventory.length) * 100);
              
              return (
                <View key={entry.name} style={styles.categoryItem}>
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryIcon, { backgroundColor: catColor.bg }]}>
                      <Ionicons 
                        name={
                          entry.name === 'produce' ? 'leaf' :
                          entry.name === 'dairy' ? 'water' :
                          entry.name === 'meat' ? 'flame' :
                          entry.name === 'pantry' ? 'file-tray-stacked' :
                          entry.name === 'frozen' ? 'snow' : 'cube'
                        } 
                        size={14} 
                        color={catColor.icon || catColor.text} 
                      />
                    </View>
                    <Text style={styles.categoryName}>{entry.name}</Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <View style={styles.progressBarBg}>
                      <View 
                        style={[
                          styles.progressBarFill, 
                          { width: `${percentage}%`, backgroundColor: catColor.icon || catColor.text }
                        ]} 
                      />
                    </View>
                    <Text style={styles.categoryValue}>{entry.value}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="cube-outline" size={32} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyText}>No items in inventory</Text>
            <Text style={styles.emptySubtext}>Scan a receipt or add items manually</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Expiring Soon Alert */}
      {expiringItems.length > 0 && (
        <TouchableOpacity
          style={styles.alertCard}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Inventory')}
        >
          <View style={styles.alertHeader}>
            <View style={styles.alertIconBg}>
              <Ionicons name="warning" size={18} color={Colors.warning} />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Expiring Soon</Text>
              <Text style={styles.alertSubtitle}>{expiringItems.length} item{expiringItems.length > 1 ? 's' : ''} within 3 days</Text>
            </View>
          </View>
          <View style={styles.alertItems}>
            {expiringItems.slice(0, 3).map(item => (
              <View key={item.id} style={styles.alertItem}>
                <Text style={styles.alertItemText}>{item.name}</Text>
                <Text style={styles.alertItemDate}>
                  {new Date(item.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            ))}
            {expiringItems.length > 3 && (
              <Text style={styles.alertMore}>+{expiringItems.length - 3} more</Text>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Inventory')}
          >
            <View style={[styles.actionIconBg, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="camera" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.actionText}>Scan Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Recipes')}
          >
            <View style={[styles.actionIconBg, { backgroundColor: Colors.warningLight }]}>
              <Ionicons name="restaurant" size={24} color={Colors.warning} />
            </View>
            <Text style={styles.actionText}>Get Recipes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Planner')}
          >
            <View style={[styles.actionIconBg, { backgroundColor: Colors.infoLight }]}>
              <Ionicons name="calendar" size={24} color={Colors.info} />
            </View>
            <Text style={styles.actionText}>Plan Meals</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerContent: {},
  greeting: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    ...Colors.shadow.medium,
  },
  statCardPrimary: {
    backgroundColor: Colors.primary,
  },
  statCardWarning: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.warningLight,
  },
  statCardError: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.errorLight,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statIconWarning: {
    backgroundColor: Colors.warningLight,
  },
  statIconError: {
    backgroundColor: Colors.errorLight,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  statValueDark: {
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statLabelDark: {
    color: Colors.textSecondary,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    ...Colors.shadow.medium,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  categoryList: {
    gap: 14,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 15,
    color: Colors.text,
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBg: {
    width: 60,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.borderLight,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    minWidth: 24,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
  alertCard: {
    backgroundColor: Colors.warningLight,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  alertIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {},
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400e',
  },
  alertSubtitle: {
    fontSize: 13,
    color: '#b45309',
    marginTop: 2,
  },
  alertItems: {
    gap: 8,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  alertItemText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
  },
  alertItemDate: {
    fontSize: 13,
    color: '#b45309',
  },
  alertMore: {
    fontSize: 13,
    color: '#b45309',
    textAlign: 'center',
    marginTop: 4,
  },
  quickActions: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  quickActionsTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 14,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    ...Colors.shadow.small,
  },
  actionIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 100,
  },
});
