import express from 'express';
import {
  getMenu,
  toggleAvailability,
  createMenuItem,
  updateMenuItem,
  updateStock,
  deleteMenuItem,
  getSessionDetails,
  setSessionOverride
} from '../controllers/menuController.js';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  reprintOrder,
  getDailyReport,
  triggerTestPrint
} from '../controllers/orderController.js';
import { getPrinterStatus, setPrinterStatus } from '../controllers/printerController.js';
import {
  getPendingPrintJobs,
  acknowledgeJob,
  failoverJob,
  getQueueStatus
} from '../controllers/printAgentController.js';
import { campusLogin } from '../controllers/authController.js';
import { db } from '../config/database.js';

const router = express.Router();

// Campus Role Authentication
router.post('/auth/login', campusLogin);

// Menu Routes (Dynamic CRUD & Stock Tracking)
router.get('/menu', getMenu);
router.post('/menu', createMenuItem);
router.put('/menu/:id', updateMenuItem);
router.patch('/menu/:id/stock', updateStock);
router.post('/menu/:id/toggle', toggleAvailability);
router.delete('/menu/:id', deleteMenuItem);

// Session Routes (Morning, Lunch, Dining)
router.get('/sessions', getSessionDetails);
router.post('/sessions/override', setSessionOverride);

// Order Routes
router.get('/orders', getOrders);
router.post('/orders', createOrder);
router.get('/orders/:id', getOrderById);
router.patch('/orders/:id/status', updateOrderStatus);
router.post('/orders/:id/reprint', reprintOrder);

// Local Print Agent & Queue Routes
router.get('/print-queue/pending', getPendingPrintJobs);
router.post('/print-queue/:id/ack', acknowledgeJob);
router.post('/print-queue/:id/fail', failoverJob);
router.get('/print-queue/status', getQueueStatus);

// Printer Spooler Routes
router.get('/printers', getPrinterStatus);
router.post('/printers/:printerId/status', setPrinterStatus);
router.post('/printers/test-print', triggerTestPrint);

// End-of-Day Z-Report & Sales Reconciliation
router.get('/reports/daily-summary', getDailyReport);

// Analytics & Dashboard Stats
router.get('/stats', (req, res) => {
  try {
    const totalOrdersRow = db.prepare('SELECT COUNT(*) as count FROM orders').get();
    const digitalOrdersRow = db.prepare("SELECT COUNT(*) as count FROM orders WHERE order_source = 'DIGITAL_WEB'").get();
    const manualOrdersRow = db.prepare("SELECT COUNT(*) as count FROM orders WHERE order_source = 'MANUAL_COUNTER'").get();
    const printer1Row = db.prepare("SELECT COUNT(*) as count FROM orders WHERE assigned_printer = 'PRINTER_1'").get();
    const printer2Row = db.prepare("SELECT COUNT(*) as count FROM orders WHERE assigned_printer = 'PRINTER_2'").get();
    const revenueRow = db.prepare('SELECT SUM(total_amount) as total FROM orders').get();
    const activeQueueRow = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status IN ('PREPARING')").get();

    return res.json({
      success: true,
      stats: {
        totalOrders: totalOrdersRow.count,
        digitalOrders: digitalOrdersRow.count,
        manualOrders: manualOrdersRow.count,
        printer1Orders: printer1Row.count,
        printer2Orders: printer2Row.count,
        totalRevenue: revenueRow.total || 0,
        activeQueueCount: activeQueueRow.count
      }
    });
  } catch (err) {
    console.error('[getStats] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
