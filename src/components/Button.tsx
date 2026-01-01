import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
  fullWidth = false,
}) => {
  const getButtonStyle = (): ViewStyle[] => {
    const base: ViewStyle[] = [styles.button];
    
    // Size
    if (size === 'sm') base.push(styles.buttonSm);
    else if (size === 'lg') base.push(styles.buttonLg);
    else base.push(styles.buttonMd);
    
    // Variant
    if (variant === 'primary') base.push(styles.buttonPrimary);
    else if (variant === 'secondary') base.push(styles.buttonSecondary);
    else if (variant === 'ghost') base.push(styles.buttonGhost);
    else base.push(styles.buttonOutline);
    
    // Full width
    if (fullWidth) base.push(styles.fullWidth);
    
    // Disabled
    if (disabled || isLoading) base.push(styles.buttonDisabled);
    
    return base;
  };

  const getTextStyle = (): TextStyle[] => {
    const base: TextStyle[] = [styles.buttonText];
    
    if (size === 'sm') base.push(styles.textSm);
    else if (size === 'lg') base.push(styles.textLg);
    
    if (variant === 'primary') base.push(styles.textPrimary);
    else if (variant === 'secondary') base.push(styles.textSecondary);
    else if (variant === 'ghost') base.push(styles.textGhost);
    else base.push(styles.textOutline);
    
    return base;
  };

  const getIconColor = () => {
    if (variant === 'primary') return Colors.textInverse;
    if (variant === 'secondary') return Colors.primary;
    if (variant === 'ghost') return Colors.primary;
    return Colors.text;
  };

  const getIconSize = () => {
    if (size === 'sm') return 14;
    if (size === 'lg') return 20;
    return 16;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <ActivityIndicator 
          color={variant === 'primary' ? Colors.textInverse : Colors.primary} 
          size="small" 
        />
      );
    }

    const iconElement = icon ? (
      <Ionicons 
        name={icon} 
        size={getIconSize()} 
        color={getIconColor()} 
        style={iconPosition === 'left' ? styles.iconLeft : styles.iconRight}
      />
    ) : null;

    return (
      <View style={styles.content}>
        {iconPosition === 'left' && iconElement}
        <Text style={[...getTextStyle(), textStyle]}>{children}</Text>
        {iconPosition === 'right' && iconElement}
      </View>
    );
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      style={[...getButtonStyle(), style]}
      activeOpacity={0.7}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    ...Colors.shadow.small,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSm: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonMd: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  buttonLg: {
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 16,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonSecondary: {
    backgroundColor: Colors.primaryLight,
    ...Colors.shadow.small,
  },
  buttonOutline: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
  buttonText: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  textSm: {
    fontSize: 13,
  },
  textLg: {
    fontSize: 17,
  },
  textPrimary: {
    color: Colors.textInverse,
  },
  textSecondary: {
    color: Colors.primary,
  },
  textOutline: {
    color: Colors.text,
  },
  textGhost: {
    color: Colors.primary,
  },
  iconLeft: {
    marginRight: 6,
  },
  iconRight: {
    marginLeft: 6,
  },
});
