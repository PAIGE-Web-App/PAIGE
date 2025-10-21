// lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

// Lazy initialization flag
let initialized = false;

function initializeAdminApp() {
  if (initialized || admin.apps.length > 0) {
    return;
  }
  
  try {
    const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (base64Key) {
      const serviceAccount = JSON.parse(Buffer.from(base64Key, 'base64').toString());
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

// Lazy getters for adminDb and adminAuth
export function getAdminDb() {
  initializeAdminApp();
  return admin.firestore();
}

export function getAdminAuth() {
  initializeAdminApp();
  return admin.auth();
}

// For backward compatibility, export adminDb and adminAuth as getters
export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(target, prop) {
    const db = getAdminDb();
    return (db as any)[prop];
  }
});

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(target, prop) {
    const auth = getAdminAuth();
    return (auth as any)[prop];
  }
});

export { admin };