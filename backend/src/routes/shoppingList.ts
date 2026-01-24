import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// Get Shopping List
router.get('/', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await query(
      'SELECT * FROM shopping_items WHERE user_id = $1 ORDER BY created_at', 
      [userId]
    );
    
    const items = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      quantity: row.quantity,
      category: row.category,
      checked: row.checked
    }));
    
    res.json({ items });
  } catch (err) {
    req.log.error({ err }, 'Get shopping list failed');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add item to shopping list
router.post('/', async (req: any, res: Response) => {
  const { name, quantity, category } = req.body;
  
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await query(
      `INSERT INTO shopping_items (user_id, name, quantity, category, checked)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING *`,
      [userId, name, quantity, category]
    );
    
    res.json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      quantity: result.rows[0].quantity,
      category: result.rows[0].category,
      checked: result.rows[0].checked
    });
  } catch (err) {
    req.log.error({ err }, 'Add shopping item failed');
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Clear checked items (must be before '/:id' delete route)
router.delete('/checked', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await query(
      'DELETE FROM shopping_items WHERE user_id = $1 AND checked = TRUE',
      [userId]
    );
    res.json({ success: true, deleted: result.rowCount });
  } catch (err) {
    req.log.error({ err }, 'Clear checked shopping items failed');
    res.status(500).json({ error: 'Failed to clear checked items' });
  }
});

// Toggle item checked status
router.post('/:id/toggle', async (req: any, res: Response) => {
  const { id } = req.params;
  
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await query(
      `UPDATE shopping_items 
       SET checked = NOT checked, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      quantity: result.rows[0].quantity,
      category: result.rows[0].category,
      checked: result.rows[0].checked
    });
  } catch (err) {
    req.log.error({ err }, 'Toggle shopping item failed');
    res.status(500).json({ error: 'Failed to toggle item' });
  }
});

// Update item
router.put('/:id', async (req: any, res: Response) => {
  const { id } = req.params;
  const { name, quantity, category, checked } = req.body;

  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await query(
      `UPDATE shopping_items
       SET name = COALESCE($3, name),
           quantity = COALESCE($4, quantity),
           category = COALESCE($5, category),
           checked = COALESCE($6, checked),
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, name ?? null, quantity ?? null, category ?? null, typeof checked === 'boolean' ? checked : null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      quantity: result.rows[0].quantity,
      category: result.rows[0].category,
      checked: result.rows[0].checked,
    });
  } catch (err) {
    req.log.error({ err }, 'Update shopping item failed');
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item
router.delete('/:id', async (req: any, res: Response) => {
  const { id } = req.params;
  
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    await query('DELETE FROM shopping_items WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'Delete shopping item failed');
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Sync shopping list
router.post('/sync', async (req: any, res: Response) => {
  const list = req.body?.items;
  
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    if (!Array.isArray(list)) {
      return res.status(400).json({ error: 'items must be an array' });
    }

    await query('DELETE FROM shopping_items WHERE user_id = $1', [userId]);
    
    for (const item of list) {
      await query(
        `INSERT INTO shopping_items (user_id, name, quantity, category, checked)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, item.name, item.quantity, item.category, item.checked]
      );
    }
    
    res.json({ success: true, count: list.length });
  } catch (err) {
    req.log.error({ err }, 'Sync shopping list failed');
    res.status(500).json({ error: 'Failed to sync shopping list' });
  }
});

// Move checked items to inventory
router.post('/move-to-inventory', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const itemIds: string[] | undefined = Array.isArray(req.body?.itemIds) ? req.body.itemIds : undefined;

    const itemsResult = itemIds && itemIds.length > 0
      ? await query(
          'SELECT * FROM shopping_items WHERE user_id = $1 AND id = ANY($2::uuid[])',
          [userId, itemIds]
        )
      : await query(
          'SELECT * FROM shopping_items WHERE user_id = $1 AND checked = TRUE',
          [userId]
        );
    
    // Default expiry (7 days from now)
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 7);
    const expiryDate = defaultExpiry.toISOString().split('T')[0];
    
    // Move to inventory
    for (const item of itemsResult.rows) {
      await query(
        `INSERT INTO inventory_items (user_id, name, quantity, category, expiry_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, item.name, item.quantity, item.category, expiryDate]
      );
    }
    
    // Remove from shopping list
    if (itemIds && itemIds.length > 0) {
      await query('DELETE FROM shopping_items WHERE user_id = $1 AND id = ANY($2::uuid[])', [userId, itemIds]);
    } else {
      await query('DELETE FROM shopping_items WHERE user_id = $1 AND checked = TRUE', [userId]);
    }
    
    res.json({ success: true, moved: itemsResult.rows.length });
  } catch (err) {
    req.log.error({ err }, 'Move shopping items to inventory failed');
    res.status(500).json({ error: 'Failed to move items to inventory' });
  }
});

export default router;
