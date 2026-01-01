import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { AuthSession, UserProfile } from '../types';
import { Button } from '../components/Button';
import { AuthSheet } from '../components/AuthSheet';
import { api } from '../services/api';

interface ProfileScreenProps {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  authSession: AuthSession;
  setAuthSession: React.Dispatch<React.SetStateAction<AuthSession>>;
}

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo', 'Halal', 'Kosher'];
const CUISINE_OPTIONS = ['Italian', 'Mexican', 'Chinese', 'Indian', 'Japanese', 'Thai', 'Mediterranean', 'American', 'French'];
const GOALS = ['weight-loss', 'muscle-gain', 'maintenance', 'budget-friendly'] as const;
const SKILLS = ['beginner', 'intermediate', 'advanced'] as const;

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, setUser, authSession, setAuthSession }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<UserProfile>(user);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    if (!isEditing) setEditedUser(user);
  }, [user, isEditing]);

  const handleSave = () => {
    setUser(editedUser);
    setIsEditing(false);
    Alert.alert('Saved!', 'Your profile has been updated.');
  };

  const toggleArrayItem = (array: string[], item: string) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    }
    return [...array, item];
  };

  const ChipSelector = ({
    label,
    iconName,
    options,
    selected,
    onToggle,
  }: {
    label: string;
    iconName?: keyof typeof Ionicons.glyphMap;
    options: readonly string[];
    selected: string[];
    onToggle: (item: string) => void;
  }) => (
    <View style={styles.section}>
      <View style={styles.sectionLabelRow}>
        {iconName && <Ionicons name={iconName} size={16} color={Colors.textSecondary} />}
        <Text style={styles.sectionLabel}>{label}</Text>
      </View>
      <View style={styles.chipContainer}>
        {options.map(option => (
          <TouchableOpacity
            key={option}
            style={[styles.chip, selected.includes(option) && styles.chipSelected]}
            onPress={() => isEditing && onToggle(option)}
            disabled={!isEditing}
          >
            <Text style={[styles.chipText, selected.includes(option) && styles.chipTextSelected]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const goalLabel = user.goals.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const skillLabel = user.cookingSkill.charAt(0).toUpperCase() + user.cookingSkill.slice(1);

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            if (isEditing) {
              handleSave();
            } else {
              setEditedUser(user);
              setIsEditing(true);
            }
          }}
        >
          <Ionicons name={isEditing ? 'checkmark' : 'pencil'} size={20} color={Colors.primary} />
          <Text style={styles.editButtonText}>{isEditing ? 'Save' : 'Edit'}</Text>
        </TouchableOpacity>
        </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={22} color={Colors.primary} />
          </View>
          <View style={styles.summaryTextBlock}>
            <Text style={styles.summaryName}>{user.name || 'Your Profile'}</Text>
            <Text style={styles.summarySubtext}>
              {user.householdSize} {user.householdSize === 1 ? 'person' : 'people'} • {goalLabel}
            </Text>
          </View>
        </View>
        <View style={styles.summaryChipsRow}>
          <View style={styles.summaryChip}>
            <Ionicons name="sparkles-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.summaryChipText}>{skillLabel}</Text>
          </View>
          <View style={styles.summaryChip}>
            <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.summaryChipText}>{user.maxCookingTime}m max</Text>
          </View>
          <View style={styles.summaryChip}>
            <Ionicons name="nutrition-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.summaryChipText}>{user.dietaryRestrictions.length} restrictions</Text>
          </View>
          <View style={styles.summaryChip}>
            <Ionicons name="alert-circle-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.summaryChipText}>{user.allergies.length} allergies</Text>
          </View>
        </View>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <View style={styles.sectionLabelRow}>
          <Ionicons name="shield-checkmark-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.sectionLabel}>Account</Text>
        </View>

        {authSession.mode === 'signed-in' ? (
          <>
            <View style={styles.accountRow}>
              <View style={styles.accountPill}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.accountPillText}>Signed in</Text>
              </View>
              <Text style={styles.accountMeta} numberOfLines={1}>
                {authSession.email || authSession.userId}
              </Text>
            </View>

            <Button
              variant="outline"
              icon="log-out-outline"
              onPress={() => {
                Alert.alert('Sign out?', 'You will remain in Guest mode on this device.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Sign out',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await api.auth.logout();
                      } finally {
                        setAuthSession({ mode: 'guest' });
                      }
                    },
                  },
                ]);
              }}
              fullWidth
            >
              Sign Out
            </Button>
          </>
        ) : (
          <>
            <View style={styles.accountRow}>
              <View style={styles.accountPillMuted}>
                <Ionicons name="phone-portrait-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.accountPillTextMuted}>Guest mode</Text>
              </View>
              <Text style={styles.accountMetaMuted}>Data is stored on this device</Text>
            </View>

            <View style={styles.accountBtnRow}>
              <Button
                variant="outline"
                icon="log-in-outline"
                onPress={() => {
                  setAuthMode('login');
                  setIsAuthOpen(true);
                }}
                style={styles.accountBtn}
              >
                Sign In
              </Button>
              <Button
                icon="person-add-outline"
                onPress={() => {
                  setAuthMode('signup');
                  setIsAuthOpen(true);
                }}
                style={styles.accountBtn}
              >
                Sign Up
              </Button>
            </View>
          </>
        )}
      </View>

      {/* Name */}
      <View style={styles.section}>
        <View style={styles.sectionLabelRow}>
          <Ionicons name="text-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.sectionLabel}>Name</Text>
        </View>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={editedUser.name}
            onChangeText={text => setEditedUser({ ...editedUser, name: text })}
            placeholder="Your name"
          />
        ) : (
          <Text style={[styles.value, !user.name && styles.valueMuted]}>{user.name || 'Not set'}</Text>
        )}
      </View>

      {/* Household Size */}
      <View style={styles.section}>
        <View style={styles.sectionLabelRow}>
          <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.sectionLabel}>Household Size</Text>
        </View>
        {isEditing ? (
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setEditedUser({ ...editedUser, householdSize: Math.max(1, editedUser.householdSize - 1) })}
            >
              <Ionicons name="remove" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{editedUser.householdSize}</Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setEditedUser({ ...editedUser, householdSize: editedUser.householdSize + 1 })}
            >
              <Ionicons name="add" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.value}>{user.householdSize} {user.householdSize === 1 ? 'person' : 'people'}</Text>
        )}
      </View>

      {/* Cooking Skill */}
      <View style={styles.section}>
        <View style={styles.sectionLabelRow}>
          <Ionicons name="sparkles-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.sectionLabel}>Cooking Skill</Text>
        </View>
        <View style={styles.chipContainer}>
          {SKILLS.map(skill => (
            <TouchableOpacity
              key={skill}
              style={[styles.chip, (isEditing ? editedUser : user).cookingSkill === skill && styles.chipSelected]}
              onPress={() => isEditing && setEditedUser({ ...editedUser, cookingSkill: skill })}
              disabled={!isEditing}
            >
              <Text style={[styles.chipText, (isEditing ? editedUser : user).cookingSkill === skill && styles.chipTextSelected]}>
                {skill.charAt(0).toUpperCase() + skill.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Goals */}
      <View style={styles.section}>
        <View style={styles.sectionLabelRow}>
          <Ionicons name="flag-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.sectionLabel}>Goals</Text>
        </View>
        <View style={styles.chipContainer}>
          {GOALS.map(goal => (
            <TouchableOpacity
              key={goal}
              style={[styles.chip, (isEditing ? editedUser : user).goals === goal && styles.chipSelected]}
              onPress={() => isEditing && setEditedUser({ ...editedUser, goals: goal })}
              disabled={!isEditing}
            >
              <Text style={[styles.chipText, (isEditing ? editedUser : user).goals === goal && styles.chipTextSelected]}>
                {goal.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Max Cooking Time */}
      <View style={styles.section}>
        <View style={styles.sectionLabelRow}>
          <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.sectionLabel}>Max Cooking Time</Text>
        </View>
        {isEditing ? (
          <View style={styles.sliderContainer}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setEditedUser({ ...editedUser, maxCookingTime: Math.max(15, editedUser.maxCookingTime - 15) })}
            >
              <Ionicons name="remove" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.sliderValue}>{editedUser.maxCookingTime} min</Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setEditedUser({ ...editedUser, maxCookingTime: Math.min(180, editedUser.maxCookingTime + 15) })}
            >
              <Ionicons name="add" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.value}>{user.maxCookingTime} minutes</Text>
        )}
      </View>

      {/* Dietary Restrictions */}
      <ChipSelector
        label="Dietary Restrictions"
        iconName="nutrition-outline"
        options={DIETARY_OPTIONS}
        selected={isEditing ? editedUser.dietaryRestrictions : user.dietaryRestrictions}
        onToggle={item =>
          setEditedUser({
            ...editedUser,
            dietaryRestrictions: toggleArrayItem(editedUser.dietaryRestrictions, item),
          })
        }
      />

      {/* Cuisine Preferences */}
      <ChipSelector
        label="Cuisine Preferences"
        iconName="earth-outline"
        options={CUISINE_OPTIONS}
        selected={isEditing ? editedUser.cuisinePreferences : user.cuisinePreferences}
        onToggle={item =>
          setEditedUser({
            ...editedUser,
            cuisinePreferences: toggleArrayItem(editedUser.cuisinePreferences, item),
          })
        }
      />

      {/* Allergies */}
      <View style={styles.section}>
        <View style={styles.sectionLabelRow}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.sectionLabel}>Allergies</Text>
        </View>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={editedUser.allergies.join(', ')}
            onChangeText={text => setEditedUser({ ...editedUser, allergies: text.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="e.g., Peanuts, Shellfish"
          />
        ) : (
          <Text style={styles.value}>
            {user.allergies.length > 0 ? user.allergies.join(', ') : 'None specified'}
          </Text>
        )}
      </View>

        {isEditing && (
          <View style={styles.buttonRow}>
            <Button
              variant="outline"
              onPress={() => {
                setEditedUser(user);
                setIsEditing(false);
              }}
              style={styles.cancelBtn}
            >
              Cancel
            </Button>
            <Button onPress={handleSave} style={styles.saveBtn}>
              Save Changes
            </Button>
          </View>
        )}
      </ScrollView>

      <AuthSheet
        visible={isAuthOpen}
        mode={authMode}
        onChangeMode={setAuthMode}
        onClose={() => setIsAuthOpen(false)}
        onSignedIn={session => {
          setAuthSession(session);
          Alert.alert('Welcome!', 'You are now signed in.');
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    ...Colors.shadow.small,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    ...Colors.shadow.small,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  value: {
    fontSize: 17,
    color: Colors.text,
    fontWeight: '500',
  },
  valueMuted: {
    color: Colors.textMuted,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    ...Colors.shadow.medium,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTextBlock: {
    flex: 1,
  },
  summaryName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  summaryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  summaryChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.successLight,
  },
  accountPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.success,
  },
  accountPillMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.borderLight,
  },
  accountPillTextMuted: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  accountMeta: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  accountMetaMuted: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  accountBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  accountBtn: {
    flex: 1,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  chipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    minWidth: 50,
    textAlign: 'center',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  sliderValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    minWidth: 90,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 16,
    paddingBottom: 20,
  },
  cancelBtn: {
    flex: 1,
  },
  saveBtn: {
    flex: 1,
  },
});
