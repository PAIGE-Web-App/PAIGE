// lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

function initializeAdminApp() {
  if (!admin.apps.length) {
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
  }
}

initializeAdminApp();

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

// Export getAdminDb for backward compatibility
export function getAdminDb() {
  return adminDb;
}

export { admin };