import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../canteen.sqlite');

export const db = new DatabaseSync(dbPath);

export function initDatabase() {
  // 1. Create Menu Items Table with dynamic stock & session fields
  db.exec(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      session TEXT NOT NULL DEFAULT 'ALL_DAY',
      stock_quantity INTEGER NOT NULL DEFAULT 50,
      is_tracked INTEGER NOT NULL DEFAULT 1,
      is_available INTEGER NOT NULL DEFAULT 1,
      prep_time_minutes INTEGER DEFAULT 5,
      description TEXT DEFAULT ''
    );
  `);

  // Ensure 'session', 'stock_quantity', 'is_tracked' columns exist for existing DBs
  try {
    db.exec(`ALTER TABLE menu_items ADD COLUMN session TEXT DEFAULT 'ALL_DAY';`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE menu_items ADD COLUMN stock_quantity INTEGER DEFAULT 50;`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE menu_items ADD COLUMN is_tracked INTEGER DEFAULT 1;`);
  } catch (e) {}

  // 2. Create Orders Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      token_number INTEGER UNIQUE NOT NULL,
      claim_code TEXT DEFAULT '',
      order_source TEXT NOT NULL,
      customer_name TEXT DEFAULT 'Student',
      payment_method TEXT DEFAULT 'UPI',
      payment_status TEXT DEFAULT 'PAID',
      status TEXT DEFAULT 'PREPARING',
      total_amount REAL NOT NULL,
      assigned_printer TEXT NOT NULL,
      print_status TEXT DEFAULT 'PRINTED',
      reprint_count INTEGER DEFAULT 0,
      receipt_text TEXT,
      printed_at TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  try {
    db.exec(`ALTER TABLE orders ADD COLUMN claim_code TEXT DEFAULT '';`);
  } catch (e) {}

  // 3. Create Order Items Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
    );
  `);

  // 4. Create Print Queue Table (Cloud Queue for Local Print Agent)
  db.exec(`
    CREATE TABLE IF NOT EXISTS print_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      order_number TEXT NOT NULL,
      token_number INTEGER NOT NULL,
      claim_code TEXT DEFAULT '',
      order_source TEXT NOT NULL,
      customer_name TEXT,
      total_amount REAL NOT NULL,
      assigned_printer TEXT NOT NULL,
      receipt_text TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      created_at TEXT,
      printed_at TEXT
    );
  `);

  try {
    db.exec(`ALTER TABLE print_queue ADD COLUMN claim_code TEXT DEFAULT '';`);
  } catch (e) {}

  // 5. Seed / Update Menu Items with Session Tags and Stock Quantities if empty
  const countRow = db.prepare('SELECT COUNT(*) as count FROM menu_items').get();
  if (countRow.count === 0) {
    const seedStmt = db.prepare(`
      INSERT INTO menu_items (name, category, price, session, stock_quantity, is_tracked, is_available, prep_time_minutes, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialMenu = [
      // Morning (Breakfast)
      ['Crispy Masala Dosa', 'Breakfast', 50.0, 'MORNING', 40, 1, 1, 6, 'Crispy golden dosa served with coconut chutney and hot sambar'],
      ['Steamed Idli Vada Combo', 'Breakfast', 40.0, 'MORNING', 35, 1, 1, 4, '2 soft idlis & 1 crispy medu vada with sambar & chutney'],
      ['Poori Masala (3 pcs)', 'Breakfast', 45.0, 'MORNING', 30, 1, 1, 5, 'Golden puffy pooris with spiced potato masala'],

      // Lunch
      ['Veg Meals Thali', 'Meals', 80.0, 'LUNCH', 50, 1, 1, 5, 'Steamed rice, sambar, rasam, kootu, poriyal, curd & appalam'],
      ['Veg Fried Rice & Manchurian', 'Meals', 90.0, 'LUNCH', 40, 1, 1, 8, 'Aromatic wok-tossed rice with savory veg manchurian'],
      ['Paneer Butter Masala & Roti', 'Meals', 100.0, 'LUNCH', 30, 1, 1, 8, '2 soft tandoori rotis with rich cottage cheese gravy'],

      // Dining (Evening Snacks & Dinner)
      ['College Veg Samosa (2 pcs)', 'Snacks', 25.0, 'DINING', 60, 1, 1, 2, 'Crispy golden fried pastry with spiced potato filling & mint chutney'],
      ['Veg Grilled Cheese Sandwich', 'Snacks', 45.0, 'DINING', 35, 1, 1, 5, 'Toasted artisan bread with spiced veggies and melted mozzarella'],
      ['French Fries (Crispy Salted)', 'Snacks', 50.0, 'DINING', 40, 1, 1, 4, 'Hot salted golden fries with tangy tomato dip'],

      // All-Day Favorites
      ['Special South Filter Coffee', 'Beverages', 15.0, 'ALL_DAY', 100, 1, 1, 2, 'Traditional hot frothy filter coffee brewed fresh'],
      ['Cardamom Masala Chai', 'Beverages', 12.0, 'ALL_DAY', 100, 1, 1, 2, 'Authentic spiced milk tea with crushed cardamom & ginger'],
      ['Chilled Badam Milk', 'Beverages', 30.0, 'ALL_DAY', 50, 1, 1, 1, 'Rich almond flavoured chilled creamy beverage']
    ];

    for (const item of initialMenu) {
      seedStmt.run(...item);
    }
    console.log(`[Database] Seeded ${initialMenu.length} canteen menu items with stock quantities.`);
  } else {
    // Ensure existing items have non-null stock quantities
    db.exec(`UPDATE menu_items SET stock_quantity = 50 WHERE stock_quantity IS NULL OR stock_quantity = 0 AND is_available = 1;`);
  }

  console.log('[Database] SQLite initialized with dynamic stock inventory & menu tracking.');
}
