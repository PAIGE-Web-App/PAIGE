// lib/firebaseCategories.ts
import { db, getUserCollectionRef } from "./firebase"; // Import getUserCollectionRef
import {
  collection, // Keep if you still need to reference root-level collections, otherwise remove
  getDocs,
  query,
  where,
  addDoc,
  doc,
  setDoc,
  deleteDoc
} from "firebase/firestore";

// Default categories
export const defaultCategories = ["Photographer", "Caterer", "Florist", "DJ", "Venue"];

// Helper function to identify Firestore document IDs
const isFirestoreDocumentId = (category: string): boolean => {
  // Firestore document IDs are typically 20 characters long and contain only letters, numbers, and hyphens
  return typeof category === 'string' && /^[a-zA-Z0-9_-]{15,}$/.test(category);
};

export const getAllCategories = async (userId: string): Promise<string[]> => {
  try {
    if (!userId) {
      console.warn("getAllCategories: userId is undefined. Returning default categories.");
      return Array.from(new Set([...defaultCategories])).sort((a, b) => a.localeCompare(b));
    }

    // --- FIX: Use getUserCollectionRef for user-specific categories ---
    const categoriesRef = getUserCollectionRef('categories', userId);
    // --- END FIX ---

    // Query categories specific to the user OR default categories
    // The where("userId", "==", userId) is now redundant because it's part of the path,
    // but keeping it doesn't hurt and adds an extra layer of data integrity check if your documents also have a userId field.
    const q = query(categoriesRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const userCategories = snapshot.docs.map((doc) => {
      const data = doc.data() as { name?: string };
      return data?.name;
    }).filter((name): name is string => Boolean(name));
    
    // Filter out Firestore document IDs from user categories
    const filteredUserCategories = userCategories.filter(category => !isFirestoreDocumentId(category));
    
    // Combine default categories with user-specific categories, remove duplicates, and sort
    return Array.from(new Set([...defaultCategories, ...filteredUserCategories])).sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }
};

export const saveCategoryIfNew = async (name: string, userId: string) => {
  try {
    if (!userId) {
      console.warn("saveCategoryIfNew: userId is undefined. Cannot save category.");
      return;
    }

    // --- FIX: Use getUserCollectionRef for user-specific categories ---
    const categoriesRef = getUserCollectionRef('categories', userId);
    // --- END FIX ---

    // Check if category exists for this user
    const q = query(categoriesRef, where("name", "==", name), where("userId", "==", userId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      if (!defaultCategories.includes(name)) {
        await addDoc(categoriesRef, { name, userId, createdAt: new Date() });
      }
    }
  } catch (error) {
    console.error("Failed to save category:", error);
  }
};

export const deleteCategoryByName = async (name: string, userId: string) => {
  try {
    if (!userId) {
      console.warn("deleteCategoryByName: userId is undefined. Cannot delete category.");
      return;
    }
    const categoriesRef = getUserCollectionRef('categories', userId);
    const q = query(categoriesRef, where("name", "==", name), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
    }
  } catch (error) {
    const err: any = error;
    console.error("Failed to delete category:", err?.message || String(err));
  }
};
