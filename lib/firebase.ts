// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, CollectionReference, enableIndexedDbPersistence, doc, getDoc, updateDoc } from "firebase/firestore"; // Import collection and CollectionReference
import { getStorage } from "firebase/storage";

// Debug: Log environment variables (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('Firebase Config Environment Variables:', {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'set' : 'not set',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'set' : 'not set',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'set' : 'not set',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'set' : 'not set',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? 'set' : 'not set',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'set' : 'not set',
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ? 'set' : 'not set'
  });
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Debug: Log actual config values
console.log('Firebase Config Values:', {
  apiKey: firebaseConfig.apiKey?.substring(0, 5) + '...',
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  hasStorageBucket: !!firebaseConfig.storageBucket,
  hasMessagingSenderId: !!firebaseConfig.messagingSenderId,
  hasAppId: !!firebaseConfig.appId,
  hasMeasurementId: !!firebaseConfig.measurementId
});

// Validate required config values
const requiredKeys = ['apiKey', 'authDomain', 'projectId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0) {
  console.error('Missing Firebase configuration:', missingKeys);
  throw new Error(`Missing required Firebase configuration keys: ${missingKeys.join(', ')}. Please check your .env.local file.`);
}

// Prevent re-initialization on hot reload
let app;
try {
  const existingApps = getApps();
  console.log('Existing Firebase apps:', existingApps.length);
  
  app = existingApps.length ? getApp() : initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

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
 * /users/{userId}/{collectionName}
 * @param collectionName The name of the subcollection (e.g., "contacts", "todoItems").
 * @param userId The ID of the current user.
 * @returns A CollectionReference to the specified user-specific collection.
 */
export function getUserCollectionRef<T>(collectionName: string, userId: string): CollectionReference<T> {
  return collection(db, `users/${userId}/${collectionName}`) as CollectionReference<T>;
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
