import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Button } from './Button';
import type { AuthSession } from '../types';
import { api } from '../services/api';

type AuthSheetMode = 'login' | 'signup';

interface AuthSheetProps {
  visible: boolean;
  mode: AuthSheetMode;
  onChangeMode: (mode: AuthSheetMode) => void;
  onClose: () => void;
  onSignedIn: (session: AuthSession) => void;
}

export const AuthSheet: React.FC<AuthSheetProps> = ({
  visible,
  mode,
  onChangeMode,
  onClose,
  onSignedIn,
}) => {
  const title = useMemo(() => (mode === 'login' ? 'Sign In' : 'Create Account'), [mode]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setIsLoading(false);
  }, [visible]);

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

      onClose();
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
      `UI is ready, but OAuth flow isn't wired in the mobile app yet. For now, use email/password signup/login.`
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleRow}>
              <View style={styles.sheetIcon}>
                <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.sheetTitle}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeChip, mode === 'login' && styles.modeChipActive]}
              onPress={() => onChangeMode('login')}
            >
              <Text style={[styles.modeChipText, mode === 'login' && styles.modeChipTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeChip, mode === 'signup' && styles.modeChipActive]}
              onPress={() => onChangeMode('signup')}
            >
              <Text style={[styles.modeChipText, mode === 'signup' && styles.modeChipTextActive]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {mode === 'signup' && (
            <View style={styles.field}>
              <Text style={styles.label}>Name (optional)</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Chef"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Button onPress={submit} isLoading={isLoading} fullWidth icon={mode === 'login' ? 'log-in-outline' : 'person-add-outline'}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.oauthRow}>
            <Button
              variant="outline"
              onPress={() => oauthComingSoon('Google')}
              fullWidth
              icon="logo-google"
            >
              Continue with Google
            </Button>
            <View style={{ height: 10 }} />
            <Button
              variant="outline"
              onPress={() => oauthComingSoon('Microsoft')}
              fullWidth
              icon="logo-microsoft"
            >
              Continue with Microsoft
            </Button>
          </View>

          <Text style={styles.footerHint}>
            Guest mode keeps data on-device. Signing in enables per-user cloud data when backend sync is connected.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 26,
    ...Colors.shadow.large,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  modeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
  },
  modeChipActive: {
    backgroundColor: Colors.primaryLight,
  },
  modeChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  modeChipTextActive: {
    color: Colors.primary,
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
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
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
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  oauthRow: {
    marginBottom: 12,
  },
  footerHint: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    lineHeight: 16,
  },
});
