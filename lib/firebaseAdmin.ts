// lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

// Singleton pattern to ensure Firebase Admin is initialized only once
let isInitialized = false;

function initializeAdminApp() {
  if (!isInitialized && !admin.apps.length) {
    try {
      // Load service account from environment variables.
      // It's recommended to set these directly in your deployment environment
      // (e.g., Vercel, Netlify) for security.
      // For local development, ensure FIREBASE_SERVICE_ACCOUNT_KEY is a JSON string
      // in your .env.local file.
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (!serviceAccountJson) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.");
      }

      // Parse the service account JSON string
      const serviceAccount = JSON.parse(
        Buffer.from(serviceAccountJson, 'base64').toString()
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // databaseURL: "https://<YOUR_PROJECT_ID>.firebaseio.com" // Uncomment if using Realtime Database
        // Add other config options as needed
      });
      
      isInitialized = true;
      console.log("Firebase Admin SDK initialized successfully.");
    } catch (error) {
      console.error("Failed to initialize Firebase Admin SDK:", error);
      throw new Error("Failed to initialize Firebase Admin SDK: " + (error as Error).message);
    }
  }
}

// Initialize only when needed, not on import
function getAdminApp() {
  initializeAdminApp();
  return admin.app();
}

/**
 * Returns the initialized Firestore Admin SDK instance.
 * Ensures the Firebase Admin app is initialized before returning the database.
 * @returns {admin.firestore.Firestore} The Firestore database instance.
 */
export function getAdminDb(): admin.firestore.Firestore {
  initializeAdminApp();
  return admin.firestore();
}

// Direct initialization - initialize immediately for better compatibility
initializeAdminApp();

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export { admin };
