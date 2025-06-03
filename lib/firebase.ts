// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, CollectionReference } from "firebase/firestore"; // Import collection and CollectionReference

const firebaseConfig = {
  apiKey: "AIzaSyDjvE1sz703sthMdS_yjrfNbhe3PM_yRi8",
  authDomain: "paige-ai-db.firebaseapp.com",
  projectId: "paige-ai-db",
  storageBucket: "paige-ai-db.firebasestorage.app",
  messagingSenderId: "1069402872632",
  appId: "1:1069402872632:web:2221f3ba02dad7c4fbffcd",
  measurementId: "G-KN0Z159H9C"
};

// Prevent re-initialization on hot reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Global variables provided by the Canvas environment
declare const __app_id: string | undefined;

/**
 * Returns a Firestore CollectionReference for a user-specific subcollection.
 * This function constructs the path adhering to the Firebase Security Rules:
 * /artifacts/{appId}/users/{userId}/{collectionName}
 * @param collectionName The name of the subcollection (e.g., "contacts", "todoItems").
 * @param userId The ID of the current user.
 * @returns A CollectionReference to the specified user-specific collection.
 */
export function getUserCollectionRef<T>(collectionName: string, userId: string): CollectionReference<T> {
  // Ensure __app_id is defined, otherwise use a fallback for local development
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  return collection(db, `artifacts/${appId}/users/${userId}/${collectionName}`) as CollectionReference<T>;
}
