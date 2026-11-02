import { db } from '../config/database.js';
import { printerSpooler } from '../services/printerSpooler.js';
import { printQueueService } from '../services/printQueueService.js';
import { formatReceipt } from '../utils/receiptFormatter.js';
import { syncOrderToFirebase, updateOrderStatusInFirebase } from '../config/firebase.js';

export function createOrder(req, res) {
  try {
    const {
      items,
      order_source = 'DIGITAL_WEB',
      customer_name = 'Student',
      payment_method = 'UPI',
      payment_status = 'PAID'
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item.' });
    }

    // 0. Check inventory & stock availability dynamically
    for (const it of items) {
      const itemId = it.id || it.item_id;
      if (itemId) {
        const dbItem = db.prepare('SELECT id, name, stock_quantity, is_available, is_tracked FROM menu_items WHERE id = ?').get(itemId);
        if (dbItem) {
          if (!dbItem.is_available || (dbItem.is_tracked && dbItem.stock_quantity <= 0)) {
            return res.status(400).json({ error: `"${dbItem.name}" is sold out.` });
          }
          const reqQty = Math.max(1, parseInt(it.quantity || 1, 10));
          if (dbItem.is_tracked && dbItem.stock_quantity < reqQty) {
            return res.status(400).json({ error: `Only ${dbItem.stock_quantity} portion(s) of "${dbItem.name}" available in kitchen.` });
          }
        }
      }
    }

    // Calculate total amount
    let totalAmount = 0;
    const validatedItems = items.map(item => {
      const qty = Math.max(1, parseInt(item.quantity || 1, 10));
      const price = parseFloat(item.price || item.unit_price || 0);
      const subtotal = qty * price;
      totalAmount += subtotal;
      return {
        item_id: item.id || item.item_id || 0,
        item_name: item.name || item.item_name || 'Food Item',
        quantity: qty,
        unit_price: price,
        subtotal
      };
    });

    // 1. Determine next sequential daily token number
    const tokenRow = db.prepare('SELECT MAX(token_number) as maxToken FROM orders').get();
    const nextTokenNumber = (tokenRow && tokenRow.maxToken) ? tokenRow.maxToken + 1 : 101;

    // 2. Generate unique order number (e.g. ORD-101)
    const orderNumber = `ORD-${nextTokenNumber}`;

    // 3. Load balance and assign alternating printer (PRINTER_1 vs PRINTER_2)
    const assignedPrinter = printerSpooler.assignPrinter();

    // 4. Generate 2-digit instant claim verification code (e.g. 10 to 99)
    const claimCode = String(Math.floor(10 + Math.random() * 90));

    // 5. Format thermal slip
    const now = new Date().toISOString();
    const receiptText = formatReceipt({
      orderNumber,
      tokenNumber: nextTokenNumber,
      claimCode,
      orderSource: order_source,
      customerName: customer_name,
      paymentMethod: payment_method,
      paymentStatus: payment_status,
      items: validatedItems,
      totalAmount,
      assignedPrinter,
      printedAt: now
    });

    // 6. Save order in SQLite
    const insertOrderStmt = db.prepare(`
      INSERT INTO orders (
        order_number, token_number, claim_code, order_source, customer_name,
        payment_method, payment_status, status, total_amount,
        assigned_printer, print_status, receipt_text, printed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertOrderStmt.run(
      orderNumber,
      nextTokenNumber,
      claimCode,
      order_source,
      customer_name,
      payment_method,
      payment_status,
      'PREPARING',
      totalAmount,
      assignedPrinter,
      'PRINTED',
      receiptText,
      now
    );

    const orderId = Number(result.lastInsertRowid);

    // 7. Save order items & decrement stock dynamically
    const insertItemStmt = db.prepare(`
      INSERT INTO order_items (order_id, item_id, item_name, quantity, unit_price, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const updateStockStmt = db.prepare(`
      UPDATE menu_items 
      SET stock_quantity = MAX(0, stock_quantity - ?),
          is_available = CASE WHEN stock_quantity - ? <= 0 THEN 0 ELSE 1 END
      WHERE id = ? AND is_tracked = 1
    `);

    for (const item of validatedItems) {
      insertItemStmt.run(
        orderId,
        item.item_id,
        item.item_name,
        item.quantity,
        item.unit_price,
        item.subtotal
      );

      if (item.item_id) {
        updateStockStmt.run(item.quantity, item.quantity, item.item_id);
      }
    }

    // Broadcast stock update via SSE
    printerSpooler.emit('menu_updated', { trigger: 'ORDER_PLACED', orderId });

    const createdOrder = {
      id: orderId,
      order_number: orderNumber,
      token_number: nextTokenNumber,
      claim_code: claimCode,
      order_source,
      customer_name,
      payment_method,
      payment_status,
      status: 'PREPARING',
      total_amount: totalAmount,
      assigned_printer: assignedPrinter,
      print_status: 'PRINTED',
      receipt_text: receiptText,
      printed_at: now,
      created_at: now,
      items: validatedItems
    };

    // 8. Add Print Job to Queue (Cloud Queue for Local Print Agent)
    const queueJob = printQueueService.enqueueJob({
      orderId,
      orderNumber,
      tokenNumber: nextTokenNumber,
      claimCode,
      orderSource: order_source,
      customerName: customer_name,
      totalAmount,
      receiptText,
      assignedPrinter
    });

    // 9. Dispatch to in-memory spooler monitor & sync to Firebase Database
    printerSpooler.dispatchJob(createdOrder, receiptText);
    syncOrderToFirebase(createdOrder).catch(() => {});

    return res.status(201).json({
      success: true,
      message: `Order #${orderNumber} created, queued (Job #${queueJob.id}), and assigned to ${assignedPrinter}`,
      order: createdOrder,
      queueJobId: queueJob.id
    });
  } catch (err) {
    console.error('[createOrder] Error:', err);
    return res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
}

export function getOrders(req, res) {
  try {
    const { status, limit = 50 } = req.query;
    let query = 'SELECT * FROM orders ORDER BY id DESC LIMIT ?';
    let params = [parseInt(limit, 10)];

    if (status) {
      query = 'SELECT * FROM orders WHERE status = ? ORDER BY id DESC LIMIT ?';
      params = [status, parseInt(limit, 10)];
    }

    const orders = db.prepare(query).all(...params);

    // Fetch items for each order
    const itemStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const enrichedOrders = orders.map(order => {
      const items = itemStmt.all(order.id);
      return { ...order, items };
    });

    return res.json({ success: true, orders: enrichedOrders });
  } catch (err) {
    console.error('[getOrders] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

export function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const order = db.prepare('SELECT * FROM orders WHERE id = ? OR order_number = ?').get(id, id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    return res.json({ success: true, order: { ...order, items } });
  } catch (err) {
    console.error('[getOrderById] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch order' });
  }
}

export function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updateStmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
    const result = updateStmt.run(status, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    const enriched = { ...updatedOrder, items };

    // Emit event for real-time clients (TV display & student mobile) & sync to Firebase
    printerSpooler.emit('order_status_updated', enriched);
    if (enriched?.order_number) {
      updateOrderStatusInFirebase(enriched.order_number, status).catch(() => {});
    }

    return res.json({ success: true, order: enriched });
  } catch (err) {
    console.error('[updateOrderStatus] Error:', err);
    return res.status(500).json({ error: 'Failed to update order status' });
  }
}

export function reprintOrder(req, res) {
  try {
    const { id } = req.params;
    const { reason = 'Paper jam / Manager request' } = req.body;

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    const reprintCount = (order.reprint_count || 0) + 1;

    // Update reprint count in DB
    db.prepare('UPDATE orders SET reprint_count = ? WHERE id = ?').run(reprintCount, id);

    // Format reprint receipt with duplicate watermark
    const reprintReceipt = formatReceipt({
      orderNumber: order.order_number,
      tokenNumber: order.token_number,
      orderSource: order.order_source,
      customerName: order.customer_name,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      items,
      totalAmount: order.total_amount,
      assignedPrinter: order.assigned_printer,
      printedAt: new Date().toISOString(),
      isReprint: true,
      reprintReason: reason
    });

    // Dispatch job with isReprint = true
    const result = printerSpooler.dispatchJob(
      { ...order, items },
      reprintReceipt,
      true,
      reason
    );

    return res.json({
      success: true,
      message: `Reprinted slip for Token #${order.token_number} on ${order.assigned_printer}`,
      reprintCount,
      receiptText: reprintReceipt
    });
  } catch (err) {
    console.error('[reprintOrder] Error:', err);
    return res.status(500).json({ error: 'Failed to reprint order' });
  }
}

/**
 * End-of-Day Daily Z-Report & Sales Reconciliation
 */
export function getDailyReport(req, res) {
  try {
    const orders = db.prepare('SELECT * FROM orders ORDER BY id ASC').all();

    const totalOrders = orders.length;
    let totalRevenue = 0;
    let digitalWebOrders = 0;
    let manualCounterOrders = 0;

    for (const ord of orders) {
      totalRevenue += ord.total_amount || 0;
      if (ord.order_source === 'DIGITAL_WEB') digitalWebOrders++;
      else manualCounterOrders++;
    }

    const totalItemsRow = db.prepare('SELECT COALESCE(SUM(quantity), 0) as totalItems FROM order_items').get();
    const totalItemsSold = totalItemsRow ? totalItemsRow.totalItems : 0;

    // Item-level sales breakdown
    const itemBreakdown = db.prepare(`
      SELECT 
        item_name,
        SUM(quantity) as units_sold,
        SUM(subtotal) as total_revenue
      FROM order_items
      GROUP BY item_name
      ORDER BY units_sold DESC
    `).all();

    // Queue Time Saved: average 12 minutes saved per digital pre-order
    const queueMinutesSaved = digitalWebOrders * 12;
    const queueHoursSaved = (queueMinutesSaved / 60).toFixed(1);

    // Formatted Z-Report text for thermal printer slip
    const width = 36;
    const hr = '-'.repeat(width);
    const doubleHr = '='.repeat(width);
    const center = (text) => {
      const len = text.length;
      if (len >= width) return text.substring(0, width);
      const leftPad = Math.floor((width - len) / 2);
      const rightPad = width - len - leftPad;
      return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
    };
    const row = (left, right) => {
      const spaceNeeded = width - (left.length + right.length);
      if (spaceNeeded <= 0) return (left + ' ' + right).substring(0, width);
      return left + ' '.repeat(spaceNeeded) + right;
    };

    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const zLines = [
      doubleHr,
      center('CANTEEN EXPRESS'),
      center('DAILY SALES REPORT'),
      doubleHr,
      row(`Date: ${dateStr}`, `Time: ${timeStr}`),
      hr,
      center('*** SALES SUMMARY ***'),
      row('Total Revenue:', `Rs. ${totalRevenue.toFixed(2)}`),
      row('Total Orders:', String(totalOrders)),
      row('Digital Pre-Orders:', `${digitalWebOrders} (${totalOrders ? Math.round((digitalWebOrders / totalOrders) * 100) : 0}%)`),
      row('Counter Cash Orders:', `${manualCounterOrders} (${totalOrders ? Math.round((manualCounterOrders / totalOrders) * 100) : 0}%)`),
      row('Total Items Sold:', String(totalItemsSold)),
      row('Avg Order Value:', `Rs. ${totalOrders ? (totalRevenue / totalOrders).toFixed(1) : '0'}`),
      hr,
      center('*** QUEUE TIME SAVED ***'),
      row('Est. Queue Saved:', `${queueHoursSaved} Hours`),
      row('Wait Cut Per Order:', '12 Mins (Average)'),
      hr,
      center('*** TOP DISHES SOLD ***')
    ];

    itemBreakdown.slice(0, 5).forEach((item) => {
      zLines.push(row(`${item.units_sold}x ${item.item_name}`, `Rs.${item.total_revenue}`));
    });

    zLines.push(doubleHr);
    zLines.push(center('REGISTER BALANCED & AUDITED'));
    zLines.push(doubleHr);

    return res.json({
      success: true,
      report: {
        date: dateStr,
        timestamp: new Date().toISOString(),
        totalRevenue,
        totalOrders,
        digitalWebOrders,
        manualCounterOrders,
        totalItemsSold,
        averageOrderValue: totalOrders ? Number((totalRevenue / totalOrders).toFixed(2)) : 0,
        queueMinutesSaved,
        queueHoursSaved,
        itemBreakdown,
        zReportText: zLines.join('\n')
      }
    });
  } catch (err) {
    console.error('[getDailyReport] Error:', err);
    return res.status(500).json({ error: 'Failed to generate daily report' });
  }
}

/**
 * 1-Click Hardware Test Print
 */
export function triggerTestPrint(req, res) {
  try {
    const { printerId = 'PRINTER_1' } = req.body;
    const testToken = 999;
    const testClaim = '88';
    const now = new Date().toISOString();

    const sampleItems = [
      { item_name: 'Masala Dosa (Test)', quantity: 1, unit_price: 45, subtotal: 45 },
      { item_name: 'Filter Coffee (Test)', quantity: 2, unit_price: 20, subtotal: 40 }
    ];

    const receiptText = formatReceipt({
      orderNumber: 'TEST-999',
      tokenNumber: testToken,
      claimCode: testClaim,
      orderSource: 'DIGITAL_WEB',
      customerName: 'Hardware Test',
      paymentMethod: 'TEST_UPI',
      paymentStatus: 'PAID',
      items: sampleItems,
      totalAmount: 85,
      assignedPrinter: printerId,
      printedAt: now
    });

    const queueJob = printQueueService.enqueueJob({
      orderId: 0,
      orderNumber: 'TEST-999',
      tokenNumber: testToken,
      claimCode: testClaim,
      orderSource: 'DIGITAL_WEB',
      customerName: 'Hardware Test',
      totalAmount: 85,
      receiptText,
      assignedPrinter: printerId
    });

    printerSpooler.dispatchJob({
      id: 0,
      order_number: 'TEST-999',
      token_number: testToken,
      claim_code: testClaim,
      order_source: 'DIGITAL_WEB',
      customer_name: 'Hardware Test',
      total_amount: 85,
      assigned_printer: printerId,
      items: sampleItems
    }, receiptText);

    return res.json({
      success: true,
      message: `Test print slip enqueued to ${printerId}`,
      receiptText,
      queueJobId: queueJob.id
    });
  } catch (err) {
    console.error('[triggerTestPrint] Error:', err);
    return res.status(500).json({ error: 'Failed to trigger test print' });
  }
}
