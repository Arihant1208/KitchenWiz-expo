import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { ShoppingItem, MealPlanDay } from '../types';

interface ShoppingListScreenProps {
  shoppingList: ShoppingItem[];
  setShoppingList: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  mealPlan: MealPlanDay[];
}

export const ShoppingListScreen: React.FC<ShoppingListScreenProps> = ({
  shoppingList,
  setShoppingList,
  mealPlan,
}) => {
  const navigation = useNavigation();
  const [newItem, setNewItem] = useState('');
  const [newQuantity, setNewQuantity] = useState('');

  const addItem = useCallback(() => {
    if (!newItem.trim()) return;

    const item: ShoppingItem = {
      id: Date.now().toString(),
      name: newItem.trim(),
      quantity: newQuantity.trim() || '1',
      checked: false,
      category: 'other',
    };

    setShoppingList(prev => [...prev, item]);
    setNewItem('');
    setNewQuantity('');
  }, [newItem, newQuantity, setShoppingList]);

  const toggleItem = useCallback((id: string) => {
    setShoppingList(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  }, [setShoppingList]);

  const deleteItem = useCallback((id: string) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  }, [setShoppingList]);

  const clearChecked = useCallback(() => {
    Alert.alert(
      'Clear Checked Items',
      'Remove all checked items from your shopping list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => setShoppingList(prev => prev.filter(item => !item.checked)),
        },
      ]
    );
  }, [setShoppingList]);

  const generateFromMealPlan = useCallback(() => {
    // Collect ingredients from all meals in the meal plan
    const ingredientsNeeded: ShoppingItem[] = [];
    
    mealPlan.forEach(day => {
      const meals = [day.breakfast, day.lunch, day.dinner].filter(Boolean);
      meals.forEach(meal => {
        meal?.ingredients?.forEach(ing => {
          ingredientsNeeded.push({
            id: `${Date.now()}-${Math.random()}`,
            name: ing.name,
            quantity: String(ing.amount || '1'),
            checked: false,
            category: 'other',
          });
        });
      });
    });

    if (ingredientsNeeded.length === 0) {
      Alert.alert('No Recipes', 'Add some recipes to your meal plan first to generate a shopping list.');
      return;
    }

    // Merge duplicates
    const merged: ShoppingItem[] = [];
    ingredientsNeeded.forEach(item => {
      const existing = merged.find(
        m => m.name.toLowerCase() === item.name.toLowerCase()
      );
      if (!existing) {
        merged.push(item);
      }
    });

    setShoppingList(prev => [...prev, ...merged]);
    Alert.alert('Success', `Added ${merged.length} items from your meal plan!`);
  }, [mealPlan, setShoppingList]);

  const uncheckedItems = shoppingList.filter(item => !item.checked);
  const checkedItems = shoppingList.filter(item => item.checked);

  const renderItem = useCallback(({ item }: { item: ShoppingItem }) => (
    <TouchableOpacity
      style={[styles.itemCard, item.checked && styles.itemCardChecked]}
      onPress={() => toggleItem(item.id)}
      onLongPress={() => deleteItem(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
        {item.checked && (
          <Ionicons name="checkmark" size={14} color="#fff" />
        )}
      </View>
      <View style={styles.itemContent}>
        <Text
          style={[styles.itemName, item.checked && styles.itemNameChecked]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {item.quantity && (
          <Text style={styles.itemQuantity}>
            {item.quantity}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteItem(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  ), [toggleItem, deleteItem]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Shopping List</Text>
          <Text style={styles.headerSubtitle}>
            {uncheckedItems.length} items remaining
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={generateFromMealPlan}
        >
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Add Item */}
      <View style={styles.addContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputName}
            placeholder="Add item..."
            value={newItem}
            onChangeText={setNewItem}
            placeholderTextColor={Colors.textMuted}
            returnKeyType="done"
            onSubmitEditing={addItem}
          />
          <TextInput
            style={styles.inputQuantity}
            placeholder="Qty"
            value={newQuantity}
            onChangeText={setNewQuantity}
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={[styles.addButton, !newItem.trim() && styles.addButtonDisabled]}
            onPress={addItem}
            disabled={!newItem.trim()}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={[...uncheckedItems, ...checkedItems]}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="cart-outline" size={48} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Items Yet</Text>
            <Text style={styles.emptyMessage}>
              Add items manually or generate from your meal plan
            </Text>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateFromMealPlan}
            >
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.generateButtonText}>Generate from Meal Plan</Text>
            </TouchableOpacity>
          </View>
        }
        ListHeaderComponent={
          checkedItems.length > 0 ? (
            <View style={styles.sectionDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.sectionLabel}>Completed ({checkedItems.length})</Text>
              <TouchableOpacity onPress={clearChecked}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        stickyHeaderIndices={checkedItems.length > 0 ? [uncheckedItems.length] : undefined}
      />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerAction: {
    padding: 4,
  },
  addContainer: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputName: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  inputQuantity: {
    width: 60,
    height: 44,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    color: Colors.text,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: Colors.textMuted,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    ...Colors.shadow.small,
  },
  itemCardChecked: {
    backgroundColor: Colors.borderLight,
    opacity: 0.7,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  itemQuantity: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginHorizontal: 12,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.error,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
