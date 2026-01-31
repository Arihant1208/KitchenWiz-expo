import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'small' | 'medium';
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  icon,
  size = 'medium',
  variant = 'default',
  style,
}) => {
  const getVariantColors = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: selected ? Colors.primary : Colors.primaryLight,
          text: selected ? '#fff' : Colors.primaryDark,
        };
      case 'success':
        return {
          bg: selected ? Colors.success : Colors.successLight,
          text: selected ? '#fff' : Colors.success,
        };
      case 'warning':
        return {
          bg: selected ? Colors.warning : Colors.warningLight,
          text: selected ? '#fff' : Colors.warning,
        };
      case 'error':
        return {
          bg: selected ? Colors.error : Colors.errorLight,
          text: selected ? '#fff' : Colors.error,
        };
      default:
        return {
          bg: selected ? Colors.text : Colors.borderLight,
          text: selected ? '#fff' : Colors.textSecondary,
        };
    }
  };

  const colors = getVariantColors();
  const isSmall = size === 'small';

  const chipStyle = [
    styles.chip,
    isSmall ? styles.chipSmall : styles.chipMedium,
    { backgroundColor: colors.bg },
    style,
  ];

  const textStyle = [
    styles.label,
    isSmall ? styles.labelSmall : styles.labelMedium,
    { color: colors.text },
  ];

  const content = (
    <>
      {icon && (
        <Ionicons
          name={icon}
          size={isSmall ? 12 : 14}
          color={colors.text}
          style={styles.icon}
        />
      )}
      <Text style={textStyle}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={chipStyle} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={chipStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
  },
  chipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipMedium: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontWeight: '500',
  },
  labelSmall: {
    fontSize: 12,
  },
  labelMedium: {
    fontSize: 14,
  },
});
