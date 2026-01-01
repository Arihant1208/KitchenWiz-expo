import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

const TAB_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'grid-outline',
  Inventory: 'cube-outline',
  Recipes: 'restaurant-outline',
  Planner: 'calendar-outline',
  Profile: 'person-outline',
};

const TAB_ICON_ACTIVE: Record<string, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'grid',
  Inventory: 'cube',
  Recipes: 'restaurant',
  Planner: 'calendar',
  Profile: 'person',
};

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const barHeight = 64;

  const visibleRoutes = state.routes.filter(r => r.name !== 'Assistant');

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={[styles.bar, { height: barHeight }]}>
        {visibleRoutes.map(route => {
          const originalIndex = state.routes.findIndex(r => r.key === route.key);
          const isFocused = state.index === originalIndex;
          const { options } = descriptors[route.key];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          if (route.name === 'Recipes') {
            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={typeof label === 'string' ? label : undefined}
                testID={options.tabBarButtonTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                activeOpacity={0.85}
                style={styles.recipesWrap}
              >
                <View style={[styles.recipesButton, isFocused && styles.recipesButtonActive]}>
                  <Ionicons
                    name={isFocused ? TAB_ICON_ACTIVE.Recipes : TAB_ICON.Recipes}
                    size={26}
                    color={Colors.textInverse}
                  />
                </View>
              </TouchableOpacity>
            );
          }

          const iconName = isFocused
            ? (TAB_ICON_ACTIVE[route.name] ?? 'ellipse')
            : (TAB_ICON[route.name] ?? 'ellipse-outline');

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={typeof label === 'string' ? label : undefined}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.8}
              style={styles.tab}
            >
              <Ionicons name={iconName} size={24} color={isFocused ? Colors.primary : Colors.textMuted} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Floating Assistant button (above bottom bar, right side) */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Assistant"
        activeOpacity={0.9}
        onPress={() => navigation.navigate('Assistant')}
        style={[
          styles.assistantFab,
          {
            bottom: Math.max(insets.bottom, 10) + barHeight - 8,
          },
        ]}
      >
        <Ionicons name="chatbubble-ellipses" size={22} color={Colors.textInverse} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: 14,
  },
  tab: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipesWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipesButton: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    ...Colors.shadow.large,
  },
  recipesButtonActive: {
    backgroundColor: Colors.primaryDark,
  },
  assistantFab: {
    position: 'absolute',
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Colors.shadow.large,
  },
});
