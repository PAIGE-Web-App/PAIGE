// lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

// Cache the Firestore instance to avoid re-initializing on hot reloads
let cachedAdminDb: admin.firestore.Firestore | null = null;

/**
 * Initializes the Firebase Admin SDK if it hasn't been initialized already.
 * This function ensures that the admin app is set up correctly once.
 */
function initializeAdminApp() {
  if (!admin.apps.length) {
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
      const serviceAccount = JSON.parse(serviceAccountJson);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // databaseURL: "https://<YOUR_PROJECT_ID>.firebaseio.com" // Uncomment if using Realtime Database
      });
      console.log("Firebase Admin SDK initialized successfully.");
    } catch (error) {
      console.error("Failed to initialize Firebase Admin SDK:", error);
      throw new Error("Failed to initialize Firebase Admin SDK: " + (error as Error).message);
    }
  }
}

/**
 * Returns the initialized Firestore Admin SDK instance.
 * Ensures the Firebase Admin app is initialized before returning the database.
 * @returns {admin.firestore.Firestore} The Firestore database instance.
 */
export function getAdminDb(): admin.firestore.Firestore {
  if (!cachedAdminDb) {
    initializeAdminApp(); // Ensure the admin app is initialized
    cachedAdminDb = admin.firestore(); // Get the Firestore instance
  }
  return cachedAdminDb;
}
