import assert from 'node:assert';
import { db, initDatabase } from '../src/config/database.js';
import { createMenuItem, updateMenuItem, updateStock, deleteMenuItem, getMenu } from '../src/controllers/menuController.js';
import { createOrder } from '../src/controllers/orderController.js';
import { printerSpooler } from '../src/services/printerSpooler.js';

console.log('========================================================');
console.log(' STARTING DYNAMIC DATABASE & LIVE QUANTITY TESTS       ');
console.log('========================================================');

initDatabase();

// 1. Test Dynamic Menu Item Creation
console.log('[Test 1] Testing dynamic menu item creation...');
const fakeReqCreate = {
  body: {
    name: 'Special Mysore Pak',
    category: 'Bakery',
    price: 35,
    session: 'DINING',
    stock_quantity: 10,
    prep_time_minutes: 2,
    description: 'Rich ghee sweet'
  }
};

let createdItemId = null;
const fakeResCreate = {
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    this.body = data;
    return this;
  }
};

createMenuItem(fakeReqCreate, fakeResCreate);
assert.strictEqual(fakeResCreate.statusCode, 201, 'Creation must return 201');
assert.strictEqual(fakeResCreate.body.item.stock_quantity, 10, 'Initial stock must be 10');
createdItemId = fakeResCreate.body.item.id;
console.log(`  Created dynamic dish: "${fakeResCreate.body.item.name}" (ID: ${createdItemId}, Stock: 10)`);

// 2. Test Dynamic Stock Decrement on Order Placement
console.log('[Test 2] Testing dynamic stock decrement on order placement...');
const fakeReqOrder1 = {
  body: {
    order_source: 'DIGITAL_WEB',
    customer_name: 'Test Student',
    payment_method: 'UPI',
    items: [{ id: createdItemId, name: 'Special Mysore Pak', price: 35, quantity: 4 }]
  }
};
const fakeResOrder1 = {
  status(code) { this.statusCode = code; return this; },
  json(data) { this.body = data; return this; }
};

createOrder(fakeReqOrder1, fakeResOrder1);
assert.strictEqual(fakeResOrder1.statusCode, 201, 'Order 1 must succeed');

// Check DB directly
const itemAfterOrder1 = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(createdItemId);
console.log(`  After ordering 4 portions: Remaining Stock = ${itemAfterOrder1.stock_quantity}`);
assert.strictEqual(itemAfterOrder1.stock_quantity, 6, 'Stock must decrease from 10 to 6');
assert.strictEqual(itemAfterOrder1.is_available, 1, 'Item should still be available');

// 3. Order Remaining Stock to Trigger Automatic "Sold Out"
console.log('[Test 3] Ordering all remaining 6 portions to trigger Sold Out...');
const fakeReqOrder2 = {
  body: {
    order_source: 'MANUAL_COUNTER',
    customer_name: 'Cashier Student',
    payment_method: 'CASH',
    items: [{ id: createdItemId, name: 'Special Mysore Pak', price: 35, quantity: 6 }]
  }
};
const fakeResOrder2 = {
  status(code) { this.statusCode = code; return this; },
  json(data) { this.body = data; return this; }
};

createOrder(fakeReqOrder2, fakeResOrder2);
assert.strictEqual(fakeResOrder2.statusCode, 201, 'Order 2 must succeed');

const itemAfterOrder2 = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(createdItemId);
console.log(`  After ordering remaining 6: Remaining Stock = ${itemAfterOrder2.stock_quantity}, is_available = ${itemAfterOrder2.is_available}`);
assert.strictEqual(itemAfterOrder2.stock_quantity, 0, 'Stock must be 0');
assert.strictEqual(itemAfterOrder2.is_available, 0, 'Item must automatically transition to Sold Out (0)');

// 4. Attempt to Order Sold Out Item (Must Reject)
console.log('[Test 4] Attempting to order sold-out item (Must be rejected)...');
const fakeReqOrderFail = {
  body: {
    order_source: 'DIGITAL_WEB',
    customer_name: 'Hopeful Student',
    payment_method: 'UPI',
    items: [{ id: createdItemId, name: 'Special Mysore Pak', price: 35, quantity: 1 }]
  }
};
const fakeResOrderFail = {
  status(code) { this.statusCode = code; return this; },
  json(data) { this.body = data; return this; }
};

createOrder(fakeReqOrderFail, fakeResOrderFail);
assert.strictEqual(fakeResOrderFail.statusCode, 400, 'Ordering sold out item must be rejected with 400');
console.log(`  Rejected as expected: "${fakeResOrderFail.body.error}"`);

// 5. Test Quick Restock (+15 portions)
console.log('[Test 5] Testing dynamic restock (+15 portions)...');
const fakeReqRestock = {
  params: { id: createdItemId },
  body: { delta: 15 }
};
const fakeResRestock = {
  status(code) { this.statusCode = code; return this; },
  json(data) { this.body = data; return this; }
};

updateStock(fakeReqRestock, fakeResRestock);
assert.strictEqual(fakeResRestock.body.item.stock_quantity, 15, 'Stock must be 15 after +15 restock');
assert.strictEqual(fakeResRestock.body.item.is_available, 1, 'Item must automatically be restored to Available (1)');
console.log(`  Restocked successfully: Stock = ${fakeResRestock.body.item.stock_quantity}, Available = ${fakeResRestock.body.item.is_available}`);

// 6. Test Dynamic Price & Details Update
console.log('[Test 6] Updating dish price and session...');
const fakeReqUpdate = {
  params: { id: createdItemId },
  body: { price: 40, session: 'ALL_DAY' }
};
const fakeResUpdate = {
  status(code) { this.statusCode = code; return this; },
  json(data) { this.body = data; return this; }
};

updateMenuItem(fakeReqUpdate, fakeResUpdate);
assert.strictEqual(fakeResUpdate.body.item.price, 40, 'Price must be updated to 40');
assert.strictEqual(fakeResUpdate.body.item.session, 'ALL_DAY', 'Session must be ALL_DAY');
console.log(`  Updated details: Price = ₹${fakeResUpdate.body.item.price}, Session = ${fakeResUpdate.body.item.session}`);

// 7. Test Dynamic Deletion
console.log('[Test 7] Deleting dynamic dish from canteen menu...');
const fakeReqDelete = { params: { id: createdItemId } };
const fakeResDelete = {
  status(code) { this.statusCode = code; return this; },
  json(data) { this.body = data; return this; }
};

deleteMenuItem(fakeReqDelete, fakeResDelete);
const deletedCheck = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(createdItemId);
assert.strictEqual(deletedCheck, undefined, 'Dish must be deleted from DB');
console.log('  Dish deleted cleanly from database.');

console.log('\n>>> ALL 7 DYNAMIC DATABASE & QUANTITY TESTS PASSED! <<<');
