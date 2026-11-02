import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, initDatabase } from './config/database.js';
import {
  initFirebase,
  getFirebaseStatus,
  syncMenuToFirebase,
  syncOrderToFirebase,
  syncQueueStatsToFirebase
} from './config/firebase.js';
import apiRoutes from './routes/api.js';
import { printerSpooler } from './services/printerSpooler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize SQLite Database & Firebase Cloud Store
initDatabase();
initFirebase();

if (getFirebaseStatus().connected) {
  const menuItems = db.prepare('SELECT * FROM menu_items').all();
  await syncMenuToFirebase(menuItems);

  const orders = db.prepare('SELECT * FROM orders ORDER BY id ASC').all();
  for (const order of orders) {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    await syncOrderToFirebase({ ...order, items });
  }

  const stats = {
    totalOrders: orders.length,
    activeQueueCount: orders.filter(order => order.status === 'PREPARING').length,
    totalRevenue: orders.reduce((total, order) => total + Number(order.total_amount || 0), 0),
    syncedAt: new Date().toISOString()
  };
  await syncQueueStatsToFirebase(stats);
}

app.use(cors());
app.use(express.json());

// SSE Clients Registry
const sseClients = new Set();

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

function broadcastEvent(type, payload) {
  const message = `data: ${JSON.stringify({ type, payload, timestamp: new Date().toISOString() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Attach spooler events to SSE broadcast
printerSpooler.on('job_printed', job => {
  broadcastEvent('JOB_PRINTED', job);
});

printerSpooler.on('order_status_updated', order => {
  broadcastEvent('ORDER_STATUS_UPDATED', order);
});

printerSpooler.on('printer_status_changed', status => {
  broadcastEvent('PRINTER_STATUS_CHANGED', status);
});

printerSpooler.on('menu_updated', payload => {
  broadcastEvent('MENU_UPDATED', payload);
});

// Mount REST API
app.use('/api', apiRoutes);

// Serve static React client if built
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
  console.log(`[Static] Serving pre-built client UI from ${clientDistPath}`);
}

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    activeSseClients: sseClients.size,
    firebase: getFirebaseStatus(),
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` CANTEEN QUEUE REDUCTION & DUAL-PRINTER SERVER ACTIVE `);
  console.log(` Listening on: http://localhost:${PORT}`);
  console.log(` SSE Live Stream: http://localhost:${PORT}/api/events`);
  console.log(`=======================================================`);
});
