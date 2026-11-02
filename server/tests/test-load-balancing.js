import assert from 'node:assert';
import { db, initDatabase } from '../src/config/database.js';
import { printerSpooler } from '../src/services/printerSpooler.js';
import { printQueueService } from '../src/services/printQueueService.js';
import { sessionService } from '../src/services/sessionService.js';
import { formatReceipt } from '../src/utils/receiptFormatter.js';

console.log('===========================================================');
console.log(' STARTING CANTEEN V1: SESSIONS, QUEUE & LOAD BALANCING TEST');
console.log('===========================================================');

// 1. Initialize DB
initDatabase();

// Clear test data
db.exec('DELETE FROM print_queue;');
db.exec('DELETE FROM order_items;');
db.exec('DELETE FROM orders;');
printerSpooler.printedOrderIds.clear();
printerSpooler.lastAssignedIndex = -1;
printerSpooler.printers.PRINTER_1.printCount = 0;
printerSpooler.printers.PRINTER_2.printCount = 0;
printQueueService.lastAssignedIndex = -1;

console.log('[Test 1] Database tables cleared for test run.');

// 2. Test Session Service
console.log('[Test 2] Testing Session Service (Morning, Lunch, Dining)...');
const initialSession = sessionService.getActiveSession();
console.log(`  Default Active Session: ${initialSession.label} (${initialSession.timeRemainingText})`);
assert.ok(initialSession.id, 'Must return an active session');

// Test manual override to LUNCH
sessionService.setOverride('LUNCH');
const overriddenLunch = sessionService.getActiveSession();
assert.strictEqual(overriddenLunch.id, 'LUNCH', 'Manual override must return LUNCH');
console.log('  Manual override to LUNCH verified.');

// Reset to AUTO
sessionService.setOverride('AUTO');
const resetAuto = sessionService.getActiveSession();
assert.strictEqual(resetAuto.isOverride, false, 'Reset to AUTO must disable manual override');
console.log('  Reset to AUTO time-based clock verified.');

// 3. Simulate 10 Orders, verifying Cloud Queue & Alternating Print Distribution
console.log('[Test 3] Creating 10 orders & verifying Cloud Print Queue...');
const simulatedOrders = [
  { source: 'DIGITAL_WEB', name: 'Aarav (Student App)', items: [{ name: 'Masala Dosa', price: 50, quantity: 1 }] },
  { source: 'MANUAL_COUNTER', name: 'Cashier Counter 1', items: [{ name: 'Filter Coffee', price: 15, quantity: 2 }] },
  { source: 'DIGITAL_WEB', name: 'Priya (Student App)', items: [{ name: 'Veg Biryani', price: 90, quantity: 1 }] },
  { source: 'MANUAL_COUNTER', name: 'Cashier Counter 1', items: [{ name: 'Idli Vada Combo', price: 40, quantity: 1 }] },
  { source: 'DIGITAL_WEB', name: 'Rohan (Student App)', items: [{ name: 'Grilled Sandwich', price: 45, quantity: 1 }] },
  { source: 'MANUAL_COUNTER', name: 'Cashier Counter 2', items: [{ name: 'Samosa (2 pcs)', price: 25, quantity: 2 }] },
  { source: 'DIGITAL_WEB', name: 'Sneha (Student App)', items: [{ name: 'Masala Chai', price: 12, quantity: 2 }] },
  { source: 'MANUAL_COUNTER', name: 'Cashier Counter 1', items: [{ name: 'Badam Milk', price: 30, quantity: 1 }] },
  { source: 'DIGITAL_WEB', name: 'Vikram (Student App)', items: [{ name: 'Poori Masala', price: 45, quantity: 1 }] },
  { source: 'MANUAL_COUNTER', name: 'Cashier Counter 2', items: [{ name: 'French Fries', price: 50, quantity: 1 }] }
];

const queuedJobs = [];

for (let i = 0; i < simulatedOrders.length; i++) {
  const o = simulatedOrders[i];
  const nextTokenNumber = 101 + i;
  const orderNumber = `ORD-${nextTokenNumber}`;
  const assignedPrinter = printerSpooler.assignPrinter();
  const total = o.items.reduce((s, it) => s + it.price * it.quantity, 0);

  const receipt = formatReceipt({
    orderNumber,
    tokenNumber: nextTokenNumber,
    orderSource: o.source,
    customerName: o.name,
    paymentMethod: 'UPI',
    paymentStatus: 'PAID',
    items: o.items,
    totalAmount: total,
    assignedPrinter,
    printedAt: new Date().toISOString()
  });

  const orderRes = db.prepare(`
    INSERT INTO orders (
      order_number, token_number, order_source, customer_name,
      payment_method, payment_status, status, total_amount,
      assigned_printer, print_status, receipt_text, printed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orderNumber,
    nextTokenNumber,
    o.source,
    o.name,
    'UPI',
    'PAID',
    'PREPARING',
    total,
    assignedPrinter,
    'PRINTED',
    receipt,
    new Date().toISOString()
  );

  const orderId = Number(orderRes.lastInsertRowid);

  // Enqueue job for Local Print Agent
  const job = printQueueService.enqueueJob({
    orderId,
    orderNumber,
    tokenNumber: nextTokenNumber,
    orderSource: o.source,
    customerName: o.name,
    totalAmount: total,
    receiptText: receipt,
    assignedPrinter
  });

  printerSpooler.dispatchJob({ id: orderId, order_number: orderNumber, token_number: nextTokenNumber, total_amount: total, items: o.items, assigned_printer: assignedPrinter, order_source: o.source }, receipt);
  queuedJobs.push(job);
}

// 4. Verify 1:1 Alternating Round-Robin across Cloud Queue & Spooler
console.log('[Test 4] Verifying 1:1 alternating Round-Robin...');
for (let i = 0; i < queuedJobs.length; i++) {
  const expectedPrinter = (i % 2 === 0) ? 'PRINTER_1' : 'PRINTER_2';
  assert.strictEqual(queuedJobs[i].assignedPrinter, expectedPrinter, `Job ${i} must be assigned to ${expectedPrinter}`);
  console.log(`  Job #${queuedJobs[i].id} (${queuedJobs[i].orderNumber}) -> ${queuedJobs[i].assignedPrinter}`);
}

// 5. Test Local Print Agent Retrieval & Acknowledgment
console.log('[Test 5] Simulating Local Print Agent processing jobs...');
const pendingJobs = printQueueService.getPendingJobs();
assert.strictEqual(pendingJobs.length, 10, 'Print Agent should see 10 pending jobs in cloud queue');

for (const pJob of pendingJobs) {
  const ack = printQueueService.acknowledgePrinted(pJob.id, pJob.assigned_printer);
  assert.strictEqual(ack.success, true, `Job #${pJob.id} must be acknowledged as printed`);
}

const remainingPending = printQueueService.getPendingJobs();
assert.strictEqual(remainingPending.length, 0, 'No pending jobs should remain after agent ACK');
console.log('  Local Print Agent processed and acknowledged all 10 jobs.');

// 6. Test Idempotency & Single-Print Protection
console.log('[Test 6] Testing single-print idempotency guard...');
const firstOrderId = queuedJobs[0].orderId;
const duplicateAttempt = printerSpooler.dispatchJob({ id: firstOrderId, order_number: 'ORD-101' }, 'Duplicate content');
assert.strictEqual(duplicateAttempt.success, false, 'Duplicate print must be rejected');
console.log('  Duplicate print rejected successfully.');

console.log('\n>>> ALL 6 TESTS COMPLETED WITH 100% SUCCESS! <<<');
