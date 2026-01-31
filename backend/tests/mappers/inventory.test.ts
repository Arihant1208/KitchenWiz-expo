/**
 * Mapper Tests - Inventory
 */

import {
  mapInventoryRow,
  mapInventoryRows,
  type InventoryItemRow,
} from '../../src/mappers/inventory';

// Mock inventory row factory
function mockInventoryRow(overrides: Partial<InventoryItemRow> = {}): InventoryItemRow {
  return {
    id: 'inv-123',
    user_id: 'user-456',
    name: 'Chicken Breast',
    quantity: '500g',
    category: 'Meat',
    expiry_date: '2025-01-15',
    calories_per_unit: 165,
    created_at: new Date('2024-12-01'),
    updated_at: new Date('2024-12-10'),
    ...overrides,
  };
}

describe('mapInventoryRow', () => {
  it('should map all fields correctly', () => {
    const row = mockInventoryRow();
    const result = mapInventoryRow(row);

    expect(result.id).toBe('inv-123');
    expect(result.name).toBe('Chicken Breast');
    expect(result.quantity).toBe('500g');
    expect(result.category).toBe('Meat');
    expect(result.expiryDate).toBe('2025-01-15');
    expect(result.caloriesPerUnit).toBe(165);
  });

  it('should convert snake_case to camelCase', () => {
    const row = mockInventoryRow({
      expiry_date: '2025-02-28',
      calories_per_unit: 200,
    });
    const result = mapInventoryRow(row);

    // These should be camelCase in the response
    expect(result).toHaveProperty('expiryDate');
    expect(result).toHaveProperty('caloriesPerUnit');
    expect(result).not.toHaveProperty('expiry_date');
    expect(result).not.toHaveProperty('calories_per_unit');
  });

  it('should not include user_id in response', () => {
    const row = mockInventoryRow();
    const result = mapInventoryRow(row);

    expect(result).not.toHaveProperty('user_id');
    expect(result).not.toHaveProperty('userId');
  });

  it('should not include timestamps in response', () => {
    const row = mockInventoryRow();
    const result = mapInventoryRow(row);

    expect(result).not.toHaveProperty('created_at');
    expect(result).not.toHaveProperty('updated_at');
    expect(result).not.toHaveProperty('createdAt');
    expect(result).not.toHaveProperty('updatedAt');
  });

  it('should handle null optional fields', () => {
    const row = mockInventoryRow({
      quantity: null,
      category: null,
      expiry_date: null,
      calories_per_unit: null,
    });
    const result = mapInventoryRow(row);

    expect(result.quantity).toBeNull();
    expect(result.category).toBeNull();
    expect(result.expiryDate).toBeNull();
    expect(result.caloriesPerUnit).toBeNull();
  });
});

describe('mapInventoryRows', () => {
  it('should map multiple rows', () => {
    const rows = [
      mockInventoryRow({ id: 'inv-1', name: 'Chicken' }),
      mockInventoryRow({ id: 'inv-2', name: 'Beef' }),
      mockInventoryRow({ id: 'inv-3', name: 'Pork' }),
    ];

    const result = mapInventoryRows(rows);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('inv-1');
    expect(result[0].name).toBe('Chicken');
    expect(result[1].id).toBe('inv-2');
    expect(result[1].name).toBe('Beef');
    expect(result[2].id).toBe('inv-3');
    expect(result[2].name).toBe('Pork');
  });

  it('should return empty array for empty input', () => {
    const result = mapInventoryRows([]);
    expect(result).toEqual([]);
  });

  it('should preserve order', () => {
    const rows = [
      mockInventoryRow({ id: 'a' }),
      mockInventoryRow({ id: 'b' }),
      mockInventoryRow({ id: 'c' }),
    ];

    const result = mapInventoryRows(rows);

    expect(result.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('should apply same mapping as mapInventoryRow', () => {
    const row = mockInventoryRow();
    const singleResult = mapInventoryRow(row);
    const batchResult = mapInventoryRows([row]);

    expect(batchResult[0]).toEqual(singleResult);
  });
});
