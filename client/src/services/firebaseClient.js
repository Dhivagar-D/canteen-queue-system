/**
 * Firebase Client Configuration & Service
 * Enables real-time synchronization of canteen orders, menu availability, and queue tokens.
 */

// If client-side firebase is installed and configured, this module connects directly.
let firebaseApp = null;
let firestoreDb = null;

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSy_YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "canteen-queue-kct.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "canteen-queue-kct",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "canteen-queue-kct.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef123456"
};

export function isFirebaseConfigured() {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_API_KEY !== "AIzaSy_YOUR_API_KEY"
  );
}

export async function initFirebaseClient() {
  if (firebaseApp) return { app: firebaseApp, db: firestoreDb };

  if (!isFirebaseConfigured()) {
    return { app: null, db: null, isMock: true };
  }

  try {
    const { initializeApp } = await import('firebase/app');
    const { getFirestore } = await import('firebase/firestore');
    
    firebaseApp = initializeApp(firebaseConfig);
    firestoreDb = getFirestore(firebaseApp);
    console.log('[Firebase Client] Initialized successfully with project:', firebaseConfig.projectId);
    return { app: firebaseApp, db: firestoreDb, isMock: false };
  } catch (err) {
    console.warn('[Firebase Client] Could not initialize Firebase client:', err.message);
    return { app: null, db: null, isMock: true, error: err };
  }
}

export default {
  firebaseConfig,
  isFirebaseConfigured,
  initFirebaseClient
};
