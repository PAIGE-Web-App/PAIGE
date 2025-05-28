// lib/firebaseCategories.ts
import { db } from "./firebase";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  doc, // Import doc
  setDoc // Import setDoc for more control
} from "firebase/firestore";

// Default categories
const defaultCategories = ["Photographer", "Caterer", "Florist", "DJ", "Venue"];

export const getAllCategories = async (userId: string): Promise<string[]> => {
  try {
    // --- FIX: Add a guard to ensure userId is not undefined before querying Firestore ---
    if (!userId) {
      console.warn("getAllCategories: userId is undefined. Returning default categories.");
      return Array.from(new Set([...defaultCategories])).sort((a, b) => a.localeCompare(b));
    }
    // --- END FIX ---

    const categoriesRef = collection(db, "categories");
    // Query categories specific to the user OR default categories
    const q = query(categoriesRef, where("userId", "==", userId)); // Filter by userId
    const snapshot = await getDocs(q);
    const userCategories = snapshot.docs.map((doc) => doc.data().name);
    // Combine default categories with user-specific categories, remove duplicates, and sort
    return Array.from(new Set([...defaultCategories, ...userCategories])).sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return []; // Return empty array on error
  }
};

export const saveCategoryIfNew = async (name: string, userId: string) => { // Added userId parameter
  try {
    // --- FIX: Add a guard to ensure userId is not undefined before querying Firestore ---
    if (!userId) {
      console.warn("saveCategoryIfNew: userId is undefined. Cannot save category.");
      return;
    }
    // --- END FIX ---

    const categoriesRef = collection(db, "categories");
    // Check if category exists for this user
    const q = query(categoriesRef, where("name", "==", name), where("userId", "==", userId)); // Filter by userId
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // If it's not a default category AND doesn't exist for the user, add it
      // Note: default categories are not stored per user in 'categories' collection,
      // they are just hardcoded in the frontend. Only new custom ones are stored.
      if (!defaultCategories.includes(name)) {
        await addDoc(categoriesRef, { name, userId, createdAt: new Date() });
      }
    }
  } catch (error) {
    console.error("Failed to save category:", error);
  }
};
