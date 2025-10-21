// lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (base64Key) {
      const serviceAccount = JSON.parse(Buffer.from(base64Key, 'base64').toString());
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin initialized with service account');
    } else {
      // In development or when using application default credentials
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log('✅ Firebase Admin initialized with application default credentials');
    }
  } catch (error) {
    console.error('⚠️ Failed to initialize Firebase Admin SDK at module load:', error);
    // Don't throw - allow the module to load, and let individual functions handle errors
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

// Export getAdminDb for backward compatibility
export function getAdminDb() {
  return adminDb;
}

export { admin };
