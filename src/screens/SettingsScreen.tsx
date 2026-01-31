import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { AuthSession } from '../types';
import { api } from '../services/api';

interface SettingsScreenProps {
  authSession: AuthSession;
  setAuthSession: React.Dispatch<React.SetStateAction<AuthSession>>;
}

type SettingItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  showArrow?: boolean;
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  authSession,
  setAuthSession,
}) => {
  const navigation = useNavigation<any>();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.auth.logout();
            } finally {
              setAuthSession({ mode: 'guest' });
            }
          },
        },
      ]
    );
  };

  const settingsSections: { title: string; items: SettingItem[] }[] = [
    {
      title: 'Account',
      items: [
        {
          id: 'profile',
          icon: 'person-outline',
          label: 'Edit Profile',
          subtitle: 'Preferences, diet, allergies',
          onPress: () => navigation.navigate('Profile'),
          showArrow: true,
        },
        ...(authSession.mode === 'signed-in'
          ? [
              {
                id: 'email',
                icon: 'mail-outline' as keyof typeof Ionicons.glyphMap,
                label: 'Email',
                subtitle: authSession.email || 'Not set',
                onPress: () => {},
                showArrow: false,
              },
            ]
          : []),
      ],
    },
    {
      title: 'App',
      items: [
        {
          id: 'notifications',
          icon: 'notifications-outline',
          label: 'Notifications',
          subtitle: 'Expiry reminders, tips',
          onPress: () => Alert.alert('Coming Soon', 'Notification settings will be available soon.'),
          showArrow: true,
        },
        {
          id: 'appearance',
          icon: 'color-palette-outline',
          label: 'Appearance',
          subtitle: 'Light mode',
          onPress: () => Alert.alert('Coming Soon', 'Dark mode will be available soon.'),
          showArrow: true,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'help',
          icon: 'help-circle-outline',
          label: 'Help & FAQ',
          onPress: () => Linking.openURL('https://kitchenwiz.app/help'),
          showArrow: true,
        },
        {
          id: 'feedback',
          icon: 'chatbubble-outline',
          label: 'Send Feedback',
          onPress: () => Linking.openURL('mailto:support@kitchenwiz.app'),
          showArrow: true,
        },
        {
          id: 'rate',
          icon: 'star-outline',
          label: 'Rate the App',
          onPress: () => Alert.alert('Thank you!', 'Rating feature coming soon.'),
          showArrow: true,
        },
      ],
    },
    {
      title: 'Legal',
      items: [
        {
          id: 'privacy',
          icon: 'shield-outline',
          label: 'Privacy Policy',
          onPress: () => Linking.openURL('https://kitchenwiz.app/privacy'),
          showArrow: true,
        },
        {
          id: 'terms',
          icon: 'document-text-outline',
          label: 'Terms of Service',
          onPress: () => Linking.openURL('https://kitchenwiz.app/terms'),
          showArrow: true,
        },
      ],
    },
    {
      title: '',
      items: [
        {
          id: 'signout',
          icon: 'log-out-outline',
          label: 'Sign Out',
          onPress: handleSignOut,
          danger: true,
          showArrow: false,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {settingsSections.map(section => (
          <View key={section.title || 'actions'} style={styles.section}>
            {section.title ? (
              <Text style={styles.sectionTitle}>{section.title}</Text>
            ) : null}
            <View style={styles.sectionContent}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.settingItem,
                    idx < section.items.length - 1 && styles.settingItemBorder,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.settingIcon,
                      item.danger && styles.settingIconDanger,
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={item.danger ? Colors.error : Colors.primary}
                    />
                  </View>
                  <View style={styles.settingTextGroup}>
                    <Text
                      style={[
                        styles.settingLabel,
                        item.danger && styles.settingLabelDanger,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.subtitle && (
                      <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                    )}
                  </View>
                  {item.showArrow && (
                    <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.version}>KitchenWiz v1.0.0</Text>
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    ...Colors.shadow.small,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDanger: {
    backgroundColor: Colors.errorLight,
  },
  settingTextGroup: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  settingLabelDanger: {
    color: Colors.error,
  },
  settingSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  version: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 16,
  },
});
