export const Colors = {
  // Primary palette - Emerald
  primary: '#10b981',
  primaryLight: '#d1fae5',
  primaryDark: '#047857',
  primaryGradientStart: '#10b981',
  primaryGradientEnd: '#059669',
  
  // Background & Surface
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  
  // Text hierarchy
  text: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  textInverse: '#ffffff',
  
  // Borders
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  
  // Semantic colors
  success: '#10b981',
  successLight: '#d1fae5',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  error: '#ef4444',
  errorLight: '#fee2e2',
  info: '#3b82f6',
  infoLight: '#dbeafe',
  
  // Category colors (enhanced with better contrast)
  categories: {
    produce: { bg: '#dcfce7', text: '#166534', icon: '#22c55e' },
    dairy: { bg: '#fef9c3', text: '#854d0e', icon: '#eab308' },
    meat: { bg: '#fee2e2', text: '#991b1b', icon: '#ef4444' },
    pantry: { bg: '#ffedd5', text: '#9a3412', icon: '#f97316' },
    frozen: { bg: '#dbeafe', text: '#1e40af', icon: '#3b82f6' },
    other: { bg: '#f1f5f9', text: '#475569', icon: '#64748b' },
  },

  // Chart colors
  chartColors: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#64748b'],
  
  // Shadows (for elevation)
  shadow: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
  },
  
  // Opacity variants
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};
