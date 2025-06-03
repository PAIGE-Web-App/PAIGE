// lib/firebaseCategories.ts
import { db, getUserCollectionRef } from "./firebase"; // Import getUserCollectionRef
import {
  collection, // Keep if you still need to reference root-level collections, otherwise remove
  getDocs,
  query,
  where,
  addDoc,
  doc,
  setDoc
} from "firebase/firestore";

// Default categories
const defaultCategories = ["Photographer", "Caterer", "Florist", "DJ", "Venue"];

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
    const userCategories = snapshot.docs.map((doc) => doc.data().name);
    // Combine default categories with user-specific categories, remove duplicates, and sort
    return Array.from(new Set([...defaultCategories, ...userCategories])).sort((a, b) => a.localeCompare(b));
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
