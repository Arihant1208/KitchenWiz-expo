import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/colors';
import { Ingredient, ShoppingItem, MealPlanDay } from '../types';
import { Button } from '../components/Button';
import { parseReceiptImage, generateShoppingList } from '../services/geminiService';
import { api } from '../services/api';

interface InventoryScreenProps {
  items: Ingredient[];
  setItems: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  shoppingList: ShoppingItem[];
  setShoppingList: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  mealPlan: MealPlanDay[];
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  items,
  setItems,
  shoppingList,
  setShoppingList,
  mealPlan,
}) => {
  const [activeTab, setActiveTab] = useState<'stock' | 'shopping'>('stock');
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState<Partial<Ingredient>>({
    name: '',
    quantity: '',
    category: 'other',
    expiryDate: new Date().toISOString().split('T')[0],
  });

  // --- Stock Logic ---
  const handleScanReceipt = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        base64: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].base64) {
        setIsScanning(true);
        const mimeType = result.assets[0].mimeType || 'image/jpeg';
        const newItems = await parseReceiptImage(result.assets[0].base64, mimeType);

        const created = await Promise.all(newItems.map(item => api.inventory.add(item)));
        setItems(prev => [...prev, ...created]);
        Alert.alert('Success', `Added ${created.length} items from receipt!`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to scan receipt. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const removeItem = (id: string) => {
    Alert.alert('Remove Item', 'Are you sure you want to remove this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.inventory.delete(id);
            setItems(prev => prev.filter(i => i.id !== id));
          } catch {
            Alert.alert('Error', 'Failed to remove item.');
          }
        },
      },
    ]);
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    try {
      const updated = await api.inventory.update(editingItem.id, {
        name: editingItem.name,
        quantity: editingItem.quantity,
        category: editingItem.category,
        expiryDate: editingItem.expiryDate,
        caloriesPerUnit: editingItem.caloriesPerUnit,
      });
      setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
      setEditingItem(null);
    } catch {
      Alert.alert('Error', 'Failed to save changes.');
    }
  };

  const addNewItem = async () => {
    if (!newItem.name || !newItem.quantity) {
      Alert.alert('Error', 'Please fill in name and quantity');
      return;
    }
    try {
      const created = await api.inventory.add({
        id: 'temp',
        name: newItem.name,
        quantity: newItem.quantity,
        category: newItem.category as Ingredient['category'],
        expiryDate: newItem.expiryDate || new Date().toISOString().split('T')[0],
      });
      setItems(prev => [...prev, created]);
      setNewItem({ name: '', quantity: '', category: 'other', expiryDate: new Date().toISOString().split('T')[0] });
      setShowAddModal(false);
    } catch {
      Alert.alert('Error', 'Failed to add item.');
    }
  };

  const getDaysUntilExpiry = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const getCategoryStyle = (cat: string) => {
    return Colors.categories[cat as keyof typeof Colors.categories] || Colors.categories.other;
  };

  const getCategoryIconName = (category: Ingredient['category']): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'produce':
        return 'leaf-outline';
      case 'dairy':
        return 'cafe-outline';
      case 'meat':
        return 'restaurant-outline';
      case 'pantry':
        return 'archive-outline';
      case 'frozen':
        return 'snow-outline';
      default:
        return 'pricetag-outline';
    }
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getIngredientBadges = (ingredient: Ingredient, daysUntilExpiry: number) => {
    const badges: Array<{ label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; color: string }> = [];

    if (daysUntilExpiry < 0) {
      badges.push({ label: 'Expired', icon: 'alert-circle-outline', bg: Colors.errorLight, color: Colors.error });
    } else if (daysUntilExpiry === 0) {
      badges.push({ label: 'Expires today', icon: 'time-outline', bg: Colors.warningLight, color: Colors.warning });
    } else if (daysUntilExpiry <= 3) {
      badges.push({ label: 'Expiring soon', icon: 'warning-outline', bg: Colors.warningLight, color: Colors.warning });
    }

    if (typeof ingredient.caloriesPerUnit === 'number') {
      badges.push({
        label: `${ingredient.caloriesPerUnit} cal/unit`,
        icon: 'flame-outline',
        bg: Colors.infoLight,
        color: Colors.info,
      });
    }

    return badges;
  };

  // --- Shopping List Logic ---
  const handleGenerateShoppingList = async () => {
    if (mealPlan.length === 0) {
      Alert.alert('No Meal Plan', 'Please generate a meal plan first!');
      return;
    }
    setIsGenerating(true);
    try {
      const newList = await generateShoppingList(items, mealPlan);
      const created = await Promise.all(newList.map(item => api.shoppingList.add(item)));
      setShoppingList(prev => [...prev, ...created]);
      Alert.alert('Success', `Added ${created.length} items to shopping list!`);
    } catch (e) {
      Alert.alert('Error', 'Failed to generate list');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleCheck = async (id: string) => {
    setShoppingList(prev => prev.map(item => (item.id === id ? { ...item, checked: !item.checked } : item)));
    try {
      await api.shoppingList.toggleChecked(id);
    } catch {
      // Revert on failure.
      setShoppingList(prev => prev.map(item => (item.id === id ? { ...item, checked: !item.checked } : item)));
      Alert.alert('Error', 'Failed to update item.');
    }
  };

  const removeShoppingItem = async (id: string) => {
    try {
      await api.shoppingList.delete(id);
      setShoppingList(prev => prev.filter(item => item.id !== id));
    } catch {
      Alert.alert('Error', 'Failed to remove item.');
    }
  };

  const moveCheckedToStock = async () => {
    const checked = shoppingList.filter(i => i.checked);
    if (checked.length === 0) return;

    try {
      const ids = checked.map(i => i.id);
      await api.shoppingList.moveToInventory(ids);

      const [freshInventory, freshShopping] = await Promise.all([
        api.inventory.getAll(),
        api.shoppingList.getAll(),
      ]);

      setItems(freshInventory);
      setShoppingList(freshShopping);
      Alert.alert('Moved!', `${checked.length} items added to your Stock!`);
    } catch {
      Alert.alert('Error', 'Failed to move items.');
    }
  };

  const renderStockItem = ({ item }: { item: Ingredient }) => {
    const days = getDaysUntilExpiry(item.expiryDate);
    const catStyle = getCategoryStyle(item.category);
    const badges = getIngredientBadges(item, days);

    return (
      <View style={styles.itemCard}>
        <View style={[styles.itemIconWrap, { backgroundColor: catStyle.bg }]}>
          <Ionicons name={getCategoryIconName(item.category)} size={18} color={catStyle.text} />
        </View>
        <View style={styles.itemMain}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={[styles.categoryBadge, { backgroundColor: catStyle.bg }]}>
              <Ionicons name={getCategoryIconName(item.category)} size={12} color={catStyle.text} />
              <Text style={[styles.categoryText, { color: catStyle.text }]}>{item.category}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="cube-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{item.quantity}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{formatShortDate(item.expiryDate)}</Text>
            </View>
          </View>
          <View style={styles.expiryRow}>
            {days <= 3 && <Ionicons name="warning" size={14} color={Colors.warning} />}
            <Text style={[styles.expiryText, days <= 3 && styles.expiryWarning]}>
              {days < 0 ? 'Expired' : days === 0 ? 'Expires today' : `${days} days left`}
            </Text>
          </View>
          {badges.length > 0 && (
            <View style={styles.tagRow}>
              {badges.map(badge => (
                <View key={badge.label} style={[styles.tagChip, { backgroundColor: badge.bg }]}>
                  <Ionicons name={badge.icon} size={12} color={badge.color} />
                  <Text style={[styles.tagText, { color: badge.color }]}>{badge.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity onPress={() => setEditingItem(item)} style={styles.actionBtn}>
            <Ionicons name="pencil" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.actionBtn}>
            <Ionicons name="trash" size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderShoppingItem = ({ item }: { item: ShoppingItem }) => {
    const catStyle = getCategoryStyle(item.category);

    return (
      <TouchableOpacity style={styles.shoppingItem} onPress={() => toggleCheck(item.id)}>
        <Ionicons
          name={item.checked ? 'checkbox' : 'square-outline'}
          size={24}
          color={item.checked ? Colors.primary : Colors.textMuted}
        />
        <View style={styles.shoppingItemContent}>
          <Text style={[styles.shoppingItemName, item.checked && styles.checkedText]}>{item.name}</Text>
          <Text style={styles.shoppingItemQty}>{item.quantity}</Text>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: catStyle.bg }]}>
          <Ionicons name={getCategoryIconName(item.category)} size={12} color={catStyle.text} />
          <Text style={[styles.categoryText, { color: catStyle.text }]}>{item.category}</Text>
        </View>
        <TouchableOpacity onPress={() => removeShoppingItem(item.id)} style={styles.actionBtn}>
          <Ionicons name="close" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Edit Modal */}
      <Modal visible={!!editingItem} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Item</Text>
              <TouchableOpacity onPress={() => setEditingItem(null)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {editingItem && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={editingItem.name}
                  onChangeText={text => setEditingItem({ ...editingItem, name: text })}
                />

                <Text style={styles.inputLabel}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={editingItem.quantity}
                  onChangeText={text => setEditingItem({ ...editingItem, quantity: text })}
                />

                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.categoryPicker}>
                  {(['produce', 'dairy', 'meat', 'pantry', 'frozen', 'other'] as const).map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryOption, editingItem.category === cat && styles.categoryOptionSelected]}
                      onPress={() => setEditingItem({ ...editingItem, category: cat })}
                    >
                      <Text style={[styles.categoryOptionText, editingItem.category === cat && styles.categoryOptionTextSelected]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Button onPress={saveEdit} style={styles.saveBtn}>
                  Save Changes
                </Button>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Item Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Item</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={newItem.name}
                onChangeText={text => setNewItem({ ...newItem, name: text })}
                placeholder="e.g., Apples"
              />

              <Text style={styles.inputLabel}>Quantity</Text>
              <TextInput
                style={styles.input}
                value={newItem.quantity}
                onChangeText={text => setNewItem({ ...newItem, quantity: text })}
                placeholder="e.g., 5 pieces"
              />

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryPicker}>
                {(['produce', 'dairy', 'meat', 'pantry', 'frozen', 'other'] as const).map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryOption, newItem.category === cat && styles.categoryOptionSelected]}
                    onPress={() => setNewItem({ ...newItem, category: cat })}
                  >
                    <Text style={[styles.categoryOptionText, newItem.category === cat && styles.categoryOptionTextSelected]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button onPress={addNewItem} style={styles.saveBtn}>
                Add Item
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stock' && styles.tabActive]}
          onPress={() => setActiveTab('stock')}
        >
          <Text style={[styles.tabText, activeTab === 'stock' && styles.tabTextActive]}>Stock</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'shopping' && styles.tabActive]}
          onPress={() => setActiveTab('shopping')}
        >
          <Text style={[styles.tabText, activeTab === 'shopping' && styles.tabTextActive]}>
            Shopping ({shoppingList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'stock' ? (
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search items..."
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Button onPress={() => setShowAddModal(true)} size="sm" variant="secondary" style={styles.actionButton}>
              <Ionicons name="add" size={16} color={Colors.primary} /> Add Item
            </Button>
            <Button onPress={handleScanReceipt} size="sm" isLoading={isScanning} style={styles.actionButton}>
              <Ionicons name="camera" size={16} color="#fff" /> Scan Receipt
            </Button>
          </View>

          {/* Items List */}
          <FlatList
            data={filteredItems}
            keyExtractor={item => item.id}
            renderItem={renderStockItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No items in stock</Text>
                <Text style={styles.emptySubtext}>Add items or scan a receipt</Text>
              </View>
            }
          />
        </>
      ) : (
        <>
          {/* Shopping List Actions */}
          <View style={styles.actionRow}>
            <Button onPress={handleGenerateShoppingList} size="sm" isLoading={isGenerating} style={styles.actionButton}>
              <Ionicons name="sparkles" size={16} color="#fff" /> Generate
            </Button>
            <Button
              onPress={moveCheckedToStock}
              size="sm"
              variant="secondary"
              disabled={!shoppingList.some(i => i.checked)}
              style={styles.actionButton}
            >
              <Ionicons name="arrow-forward" size={16} color={Colors.primary} /> Move to Stock
            </Button>
          </View>

          {/* Shopping List */}
          <FlatList
            data={shoppingList}
            keyExtractor={item => item.id}
            renderItem={renderShoppingItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="cart-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Shopping list is empty</Text>
                <Text style={styles.emptySubtext}>Generate from meal plan or add items</Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    padding: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: Colors.surface,
    ...Colors.shadow.small,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    ...Colors.shadow.small,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 16,
    color: Colors.text,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  actionButton: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Colors.shadow.medium,
  },
  itemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemMain: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  expiryText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  expiryWarning: {
    color: Colors.warning,
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shoppingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 14,
    ...Colors.shadow.small,
  },
  shoppingItemContent: {
    flex: 1,
  },
  shoppingItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  shoppingItemQty: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  modalBody: {
    padding: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  categoryOptionSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  categoryOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  saveBtn: {
    marginBottom: 24,
  },
});
