import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// Get Inventory
router.get('/', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await query(
      'SELECT * FROM inventory_items WHERE user_id = $1 ORDER BY created_at DESC', 
      [userId]
    );
    const items = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      quantity: row.quantity,
      category: row.category,
      expiryDate: row.expiry_date,
      caloriesPerUnit: row.calories_per_unit
    }));
    res.json({ items });
  } catch (err) {
    req.log.error({ err }, 'Get inventory failed');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add single item to inventory
router.post('/', async (req: any, res: Response) => {
  const { name, quantity, category, expiryDate, caloriesPerUnit } = req.body;
  
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await query(
      `INSERT INTO inventory_items (user_id, name, quantity, category, expiry_date, calories_per_unit)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, name, quantity, category, expiryDate, caloriesPerUnit]
    );
    res.json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      quantity: result.rows[0].quantity,
      category: result.rows[0].category,
      expiryDate: result.rows[0].expiry_date,
      caloriesPerUnit: result.rows[0].calories_per_unit
    });
  } catch (err) {
    req.log.error({ err }, 'Add inventory item failed');
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Update inventory item
router.put('/:id', async (req: any, res: Response) => {
  const { id } = req.params;
  const { name, quantity, category, expiryDate, caloriesPerUnit } = req.body;
  
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await query(
      `UPDATE inventory_items 
       SET name = $2, quantity = $3, category = $4, expiry_date = $5, calories_per_unit = $6, updated_at = NOW()
       WHERE id = $1 AND user_id = $7
       RETURNING *`,
      [id, name, quantity, category, expiryDate, caloriesPerUnit, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      quantity: result.rows[0].quantity,
      category: result.rows[0].category,
      expiryDate: result.rows[0].expiry_date,
      caloriesPerUnit: result.rows[0].calories_per_unit
    });
  } catch (err) {
    req.log.error({ err }, 'Update inventory item failed');
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete inventory item
router.delete('/:id', async (req: any, res: Response) => {
  const { id } = req.params;
  
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    await query('DELETE FROM inventory_items WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'Delete inventory item failed');
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Sync/Replace Inventory (Bulk operation)
router.post('/sync', async (req: any, res: Response) => {
  const items = req.body?.items;
  
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items must be an array' });
    }

    // Clear existing
    await query('DELETE FROM inventory_items WHERE user_id = $1', [userId]);
    
    // Insert new
    for (const item of items) {
      await query(
        `INSERT INTO inventory_items (user_id, name, quantity, category, expiry_date, calories_per_unit)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, item.name, item.quantity, item.category, item.expiryDate, item.caloriesPerUnit]
      );
    }
    
    res.json({ success: true, count: items.length });
  } catch (err) {
    req.log.error({ err }, 'Sync inventory failed');
    res.status(500).json({ error: 'Failed to sync inventory' });
  }
});

export default router;
