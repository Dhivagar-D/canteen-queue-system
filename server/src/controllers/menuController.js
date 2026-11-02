import { db } from '../config/database.js';
import { sessionService } from '../services/sessionService.js';
import { printerSpooler } from '../services/printerSpooler.js';

export function getMenu(req, res) {
  try {
    const { session } = req.query;
    const sessionInfo = sessionService.getAllSessions();

    let query = 'SELECT * FROM menu_items ORDER BY category, name ASC';
    let params = [];

    if (session && session !== 'ALL') {
      query = "SELECT * FROM menu_items WHERE session = ? OR session = 'ALL_DAY' ORDER BY category, name ASC";
      params = [session];
    }

    const items = db.prepare(query).all(...params);

    return res.json({
      success: true,
      items,
      activeSession: sessionInfo.activeSession,
      manualOverride: sessionInfo.manualOverride,
      sessions: sessionInfo.sessions
    });
  } catch (err) {
    console.error('[getMenu] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch menu items' });
  }
}

export function createMenuItem(req, res) {
  try {
    const {
      name,
      category = 'Snacks',
      price,
      session = 'ALL_DAY',
      stock_quantity = 50,
      prep_time_minutes = 5,
      description = ''
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Dish name and price are required.' });
    }

    const insertStmt = db.prepare(`
      INSERT INTO menu_items (name, category, price, session, stock_quantity, is_tracked, is_available, prep_time_minutes, description)
      VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)
    `);

    const result = insertStmt.run(
      name.trim(),
      category,
      parseFloat(price),
      session,
      parseInt(stock_quantity, 10) || 50,
      parseInt(prep_time_minutes, 10) || 5,
      description.trim()
    );

    const newItem = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(result.lastInsertRowid);

    printerSpooler.emit('menu_updated', { action: 'CREATED', item: newItem });

    return res.status(201).json({
      success: true,
      message: `Dish "${newItem.name}" added successfully!`,
      item: newItem
    });
  } catch (err) {
    console.error('[createMenuItem] Error:', err);
    return res.status(500).json({ error: 'Failed to create menu item' });
  }
}

export function updateMenuItem(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      price,
      session,
      stock_quantity,
      prep_time_minutes,
      description
    } = req.body;

    const existing = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const updatedName = name !== undefined ? name.trim() : existing.name;
    const updatedCategory = category !== undefined ? category : existing.category;
    const updatedPrice = price !== undefined ? parseFloat(price) : existing.price;
    const updatedSession = session !== undefined ? session : existing.session;
    const updatedStock = stock_quantity !== undefined ? parseInt(stock_quantity, 10) : existing.stock_quantity;
    const updatedPrep = prep_time_minutes !== undefined ? parseInt(prep_time_minutes, 10) : existing.prep_time_minutes;
    const updatedDesc = description !== undefined ? description.trim() : existing.description;
    const isAvailable = updatedStock > 0 ? 1 : 0;

    db.prepare(`
      UPDATE menu_items 
      SET name = ?, category = ?, price = ?, session = ?, stock_quantity = ?, is_available = ?, prep_time_minutes = ?, description = ?
      WHERE id = ?
    `).run(
      updatedName,
      updatedCategory,
      updatedPrice,
      updatedSession,
      updatedStock,
      isAvailable,
      updatedPrep,
      updatedDesc,
      id
    );

    const updatedItem = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
    printerSpooler.emit('menu_updated', { action: 'UPDATED', item: updatedItem });

    return res.json({
      success: true,
      message: `Dish "${updatedItem.name}" updated successfully!`,
      item: updatedItem
    });
  } catch (err) {
    console.error('[updateMenuItem] Error:', err);
    return res.status(500).json({ error: 'Failed to update menu item' });
  }
}

export function updateStock(req, res) {
  try {
    const { id } = req.params;
    const { delta, quantity } = req.body;

    const existing = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    let newStock = existing.stock_quantity;
    if (quantity !== undefined) {
      newStock = Math.max(0, parseInt(quantity, 10));
    } else if (delta !== undefined) {
      newStock = Math.max(0, newStock + parseInt(delta, 10));
    }

    const newAvailable = newStock > 0 ? 1 : 0;

    db.prepare(`
      UPDATE menu_items
      SET stock_quantity = ?, is_available = ?
      WHERE id = ?
    `).run(newStock, newAvailable, id);

    const updatedItem = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
    printerSpooler.emit('menu_updated', { action: 'STOCK_UPDATED', item: updatedItem });

    return res.json({
      success: true,
      message: `Stock for "${updatedItem.name}" updated to ${newStock}`,
      item: updatedItem
    });
  } catch (err) {
    console.error('[updateStock] Error:', err);
    return res.status(500).json({ error: 'Failed to update stock quantity' });
  }
}

export function deleteMenuItem(req, res) {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
    printerSpooler.emit('menu_updated', { action: 'DELETED', itemId: parseInt(id, 10) });

    return res.json({
      success: true,
      message: `Dish "${existing.name}" removed from canteen menu.`
    });
  } catch (err) {
    console.error('[deleteMenuItem] Error:', err);
    return res.status(500).json({ error: 'Failed to delete menu item' });
  }
}

export function toggleAvailability(req, res) {
  try {
    const { id } = req.params;
    const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);

    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const newStatus = item.is_available ? 0 : 1;
    // If making available and stock was 0, default stock to 20
    let newStock = item.stock_quantity;
    if (newStatus === 1 && newStock <= 0) {
      newStock = 20;
    }

    db.prepare('UPDATE menu_items SET is_available = ?, stock_quantity = ? WHERE id = ?').run(newStatus, newStock, id);

    const updatedItem = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
    printerSpooler.emit('menu_updated', { action: 'AVAILABILITY_TOGGLED', item: updatedItem });

    return res.json({
      success: true,
      message: `Item "${item.name}" availability updated to ${newStatus ? 'AVAILABLE' : 'OUT_OF_STOCK'}`,
      item: updatedItem
    });
  } catch (err) {
    console.error('[toggleAvailability] Error:', err);
    return res.status(500).json({ error: 'Failed to update item availability' });
  }
}

export function getSessionDetails(req, res) {
  try {
    return res.json({
      success: true,
      ...sessionService.getAllSessions()
    });
  } catch (err) {
    console.error('[getSessionDetails] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch session details' });
  }
}

export function setSessionOverride(req, res) {
  try {
    const { sessionId } = req.body;
    const result = sessionService.setOverride(sessionId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    printerSpooler.emit('menu_updated', { action: 'SESSION_OVERRIDE', sessionId });

    return res.json({
      success: true,
      message: `Session override set to: ${sessionId || 'AUTO'}`,
      ...result
    });
  } catch (err) {
    console.error('[setSessionOverride] Error:', err);
    return res.status(500).json({ error: 'Failed to update session override' });
  }
}
