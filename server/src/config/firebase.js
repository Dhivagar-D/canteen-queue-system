import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firestore = null;
let isFirebaseConnected = false;
let initError = null;

export function initFirebase() {
  if (isFirebaseConnected && firestore) return firestore;

  try {
    // 1. Check for serviceAccountKey.json in server root or config
    const keyPaths = [
      path.resolve(__dirname, '../../serviceAccountKey.json'),
      path.resolve(__dirname, './serviceAccountKey.json'),
      process.env.GOOGLE_APPLICATION_CREDENTIALS
    ].filter(Boolean);

    let credential = null;
    let foundPath = null;

    for (const p of keyPaths) {
      if (fs.existsSync(p)) {
        try {
          const serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
          credential = cert(serviceAccount);
          foundPath = p;
          break;
        } catch (e) {
          console.warn(`[Firebase] Failed reading credential file at ${p}:`, e.message);
        }
      }
    }

    // 2. Check for environment variables if file not found
    if (!credential && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      credential = cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      });
      console.log('[Firebase] Using environment credentials for project:', process.env.FIREBASE_PROJECT_ID);
    }

    if (credential) {
      if (!getApps().length) {
        initializeApp({
          credential,
          databaseURL: process.env.FIREBASE_DATABASE_URL
        });
      }
      firestore = getFirestore();
      isFirebaseConnected = true;
      console.log(`[Firebase] 🔥 Connected to Cloud Firestore successfully${foundPath ? ` using ${path.basename(foundPath)}` : ''}`);
      return firestore;
    } else {
      const message = 'Firebase credentials are missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.';
      if (process.env.REQUIRE_FIREBASE === 'true' || process.env.NODE_ENV === 'production') {
        throw new Error(message);
      }
      console.log(`[Firebase] ℹ️ Running in Local Mode (${message})`);
      return null;
    }
  } catch (err) {
    initError = err.message;
    console.warn('[Firebase] Warning initializing Firebase:', err.message);
    return null;
  }
}

/**
 * Sync an order to Firestore
 */
export async function syncOrderToFirebase(orderData) {
  if (!firestore) initFirebase();
  if (!firestore) return null;

  try {
    const docId = orderData.order_number || `ORD-${orderData.token_number || Date.now()}`;
    const cleanData = {
      orderNumber: docId,
      tokenNumber: orderData.token_number,
      claimCode: orderData.claim_code || '',
      orderSource: orderData.order_source || 'DIGITAL_WEB',
      customerName: orderData.customer_name || 'Student',
      paymentMethod: orderData.payment_method || 'UPI',
      paymentStatus: orderData.payment_status || 'PAID',
      status: orderData.status || 'PREPARING',
      totalAmount: Number(orderData.total_amount || 0),
      assignedPrinter: orderData.assigned_printer || 'PRINTER_1',
      items: orderData.items || [],
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: orderData.created_at || new Date().toISOString()
    };

    await firestore.collection('canteen_orders').doc(docId).set(cleanData, { merge: true });
    return cleanData;
  } catch (err) {
    console.error('[Firebase] Failed to sync order to Firestore:', err.message);
    return null;
  }
}

/**
 * Update order preparation status in Firestore
 */
export async function updateOrderStatusInFirebase(orderNumber, status) {
  if (!firestore) initFirebase();
  if (!firestore) return null;

  try {
    await firestore.collection('canteen_orders').doc(orderNumber).update({
      status,
      updatedAt: FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error('[Firebase] Failed to update order status in Firestore:', err.message);
  }
}

/**
 * Sync active menu items to Firestore
 */
export async function syncMenuToFirebase(menuItems) {
  if (!firestore) initFirebase();
  if (!firestore) return null;

  try {
    const batch = firestore.batch();
    const menuCol = firestore.collection('canteen_menu');

    for (const item of menuItems) {
      const docRef = menuCol.doc(String(item.id));
      batch.set(docRef, {
        id: item.id,
        name: item.name,
        category: item.category,
        price: Number(item.price),
        session: item.session || 'ALL_DAY',
        stockQuantity: Number(item.stock_quantity ?? 50),
        isAvailable: Boolean(item.is_available),
        isTracked: Boolean(item.is_tracked),
        prepTimeMinutes: Number(item.prep_time_minutes || 5),
        description: item.description || '',
        syncedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    await batch.commit();
  } catch (err) {
    console.error('[Firebase] Failed to sync menu to Firestore:', err.message);
  }
}

/**
 * Sync live queue stats to Firestore
 */
export async function syncQueueStatsToFirebase(stats) {
  if (!firestore) initFirebase();
  if (!firestore) return null;

  try {
    await firestore.collection('canteen_system').doc('live_stats').set({
      ...stats,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error('[Firebase] Failed to sync live stats to Firestore:', err.message);
  }
}

export function getFirebaseStatus() {
  return {
    connected: isFirebaseConnected,
    projectId: process.env.FIREBASE_PROJECT_ID || (firestore ? 'configured' : null),
    error: initError
  };
}
