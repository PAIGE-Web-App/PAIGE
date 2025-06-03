// lib/getContacts.ts
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, getUserCollectionRef } from "./firebase"; // Import getUserCollectionRef

interface Contact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  category: string;
  website?: string | null;
  avatarColor?: string;
  userId: string;
}

export const getAllContacts = async (userId: string) => {
  // --- FIX: Use getUserCollectionRef for user-specific contacts ---
  const contactsCollection = getUserCollectionRef<Contact>("contacts", userId);
  // --- END FIX ---

  // The where("userId", "==", userId) is now redundant due to the path,
  // but keeping it adds an extra layer of data integrity.
  const q = query(contactsCollection, where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Contact[];
};
