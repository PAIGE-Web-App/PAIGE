// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, CollectionReference, enableIndexedDbPersistence, doc, getDoc, updateDoc } from "firebase/firestore"; // Import collection and CollectionReference

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

// Enable Firestore offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time.
    console.warn('Firestore persistence failed: Multiple tabs open.');
  } else if (err.code === 'unimplemented') {
    // The current browser does not support all of the features required to enable persistence
    console.warn('Firestore persistence is not available in this browser.');
  } else {
    console.error('Error enabling Firestore persistence:', err);
  }
});

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

/**
 * Gets the array of pinned list IDs for a user from their Firestore user document.
 * @param userId The user's UID
 * @returns Promise<string[]>
 */
export async function getPinnedListIds(userId: string): Promise<string[]> {
  const userDoc = await getDoc(doc(db, "users", userId));
  if (userDoc.exists()) {
    const data = userDoc.data();
    return Array.isArray(data.pinnedListIds) ? data.pinnedListIds : [];
  }
  return [];
}

/**
 * Sets the array of pinned list IDs for a user in their Firestore user document.
 * @param userId The user's UID
 * @param pinnedListIds Array of list IDs to pin
 * @returns Promise<void>
 */
export async function setPinnedListIds(userId: string, pinnedListIds: string[]): Promise<void> {
  await updateDoc(doc(db, "users", userId), { pinnedListIds });
}
