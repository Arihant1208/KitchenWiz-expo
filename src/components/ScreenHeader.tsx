import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
  rightActionSecondary?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
  transparent?: boolean;
  style?: ViewStyle;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBack = true,
  rightAction,
  rightActionSecondary,
  transparent = false,
  style,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 8 },
        transparent && styles.transparent,
        style,
      ]}
    >
      <View style={styles.leftSection}>
        {showBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={transparent ? '#fff' : Colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.centerSection}>
        <Text
          style={[styles.title, transparent && styles.titleTransparent]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.subtitle, transparent && styles.subtitleTransparent]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.rightSection}>
        {rightActionSecondary && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={rightActionSecondary.onPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={rightActionSecondary.icon}
              size={24}
              color={transparent ? '#fff' : Colors.text}
            />
          </TouchableOpacity>
        )}
        {rightAction && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={rightAction.onPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={rightAction.icon}
              size={24}
              color={transparent ? '#fff' : Colors.primary}
            />
          </TouchableOpacity>
        )}
        {!rightAction && !rightActionSecondary && <View style={styles.placeholder} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  transparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  leftSection: {
    width: 44,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    width: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  actionButton: {
    padding: 4,
  },
  placeholder: {
    width: 32,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  titleTransparent: {
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  subtitleTransparent: {
    color: 'rgba(255,255,255,0.8)',
  },
});
