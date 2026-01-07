import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { Button } from '../components/Button';
import type { AuthSession } from '../types';
import { api } from '../services/api';
import { googleSignIn, microsoftSignIn, isGoogleSignInAvailable, isMicrosoftSignInAvailable } from '../services/oauth';

type AuthMode = 'login' | 'signup';

interface AuthScreenProps {
  onSignedIn: (session: AuthSession) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSignedIn }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const title = useMemo(() => (mode === 'login' ? 'Sign In' : 'Create Account'), [mode]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const submit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Missing email', 'Please enter your email.');
      return;
    }
    if (!password) {
      Alert.alert('Missing password', 'Please enter your password.');
      return;
    }

    try {
      setIsLoading(true);
      if (mode === 'signup') {
        const result = await api.auth.signup({ email: trimmedEmail, password, name: name.trim() || undefined });
        onSignedIn({
          mode: 'signed-in',
          userId: result.user.id,
          email: result.user.email,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
      } else {
        const result = await api.auth.login({ email: trimmedEmail, password });
        onSignedIn({
          mode: 'signed-in',
          userId: result.user.id,
          email: result.user.email,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
      }
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : 'Something went wrong.';
      Alert.alert('Auth failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const oauthComingSoon = (provider: 'Google' | 'Microsoft') => {
    Alert.alert(
      `${provider} sign-in`,
      `OAuth is not yet configured. See src/services/oauth.ts for setup instructions.`
    );
  };

  const handleGoogleSignIn = async () => {
    if (!isGoogleSignInAvailable()) {
      oauthComingSoon('Google');
      return;
    }

    try {
      setIsLoading(true);
      const { idToken } = await googleSignIn();
      const result = await api.auth.oauthGoogle({ idToken });
      
      onSignedIn({
        mode: 'signed-in',
        userId: result.user.id,
        email: result.user.email,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : 'Google sign-in failed.';
      Alert.alert('Sign-in failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    if (!isMicrosoftSignInAvailable()) {
      oauthComingSoon('Microsoft');
      return;
    }

    try {
      setIsLoading(true);
      const { idToken } = await microsoftSignIn();
      const result = await api.auth.oauthMicrosoft({ idToken });
      
      onSignedIn({
        mode: 'signed-in',
        userId: result.user.id,
        email: result.user.email,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : 'Microsoft sign-in failed.';
      Alert.alert('Sign-in failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.brandIcon}>
              <Ionicons name="restaurant-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.brandTitle}>KitchenWiz</Text>
            <Text style={styles.brandSubtitle}>Smart kitchen assistant</Text>

            <View style={styles.heroCard}>
              <View style={styles.heroRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color={Colors.primary} />
                <Text style={styles.heroText}>Personalized recipes & meal plans</Text>
              </View>
              <View style={styles.heroRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color={Colors.primary} />
                <Text style={styles.heroText}>Inventory + expiry tracking</Text>
              </View>
              <View style={styles.heroRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color={Colors.primary} />
                <Text style={styles.heroText}>Shopping list that stays in sync</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.segmented}>
              <Pressable
                onPress={() => setMode('login')}
                style={[styles.segment, mode === 'login' && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, mode === 'login' && styles.segmentTextActive]}>Sign In</Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('signup')}
                style={[styles.segment, mode === 'signup' && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, mode === 'signup' && styles.segmentTextActive]}>Sign Up</Text>
              </Pressable>
            </View>

            <View style={styles.cardTitleRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
              <Text style={styles.cardTitle}>{title}</Text>
            </View>

            {mode === 'signup' && (
              <View style={styles.field}>
                <Text style={styles.label}>Name (optional)</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="person-outline" size={16} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Chef"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={16} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={16} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!isPasswordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={submit}
                />
                <Pressable
                  onPress={() => setIsPasswordVisible(v => !v)}
                  hitSlop={10}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={Colors.textMuted}
                  />
                </Pressable>
              </View>
            </View>

            <Button
              onPress={submit}
              isLoading={isLoading}
              fullWidth
              size="lg"
              icon={mode === 'login' ? 'log-in-outline' : 'person-add-outline'}
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button variant="outline" onPress={handleGoogleSignIn} fullWidth icon="logo-google">
              Google
            </Button>
            <View style={{ height: 10 }} />
            <Button variant="outline" onPress={handleMicrosoftSignIn} fullWidth icon="logo-microsoft">
              Microsoft
            </Button>

            <Text style={styles.footerHint}>
              By continuing you agree to connect your account to KitchenWiz.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  brandIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...Colors.shadow.small,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  heroCard: {
    marginTop: 14,
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 14,
    ...Colors.shadow.small,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  heroText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    ...Colors.shadow.medium,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    marginBottom: 14,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  segmentActive: {
    backgroundColor: Colors.primaryLight,
    ...Colors.shadow.small,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  segmentTextActive: {
    color: Colors.primaryDark,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    fontSize: 16,
    color: Colors.text,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingLeft: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerHint: {
    marginTop: 12,
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
  },
});
