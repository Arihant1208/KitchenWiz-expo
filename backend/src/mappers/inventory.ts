/**
 * Inventory Mappers
 *
 * Transform inventory data between database and API formats.
 */

export interface InventoryItemRow {
  id: string;
  user_id: string;
  name: string;
  quantity: string | null;
  category: string | null;
  expiry_date: string | null;
  calories_per_unit: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryItemResponse {
  id: string;
  name: string;
  quantity: string | null;
  category: string | null;
  expiryDate: string | null;
  caloriesPerUnit: number | null;
}

/**
 * Map database row to API response.
 */
export function mapInventoryRow(row: InventoryItemRow): InventoryItemResponse {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    category: row.category,
    expiryDate: row.expiry_date,
    caloriesPerUnit: row.calories_per_unit,
  };
}

/**
 * Map multiple inventory rows.
 */
export function mapInventoryRows(rows: InventoryItemRow[]): InventoryItemResponse[] {
  return rows.map(mapInventoryRow);
}
