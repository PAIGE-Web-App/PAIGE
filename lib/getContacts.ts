// lib/getContacts.ts
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, getUserCollectionRef } from "./firebase"; // Import getUserCollectionRef
import type { Contact } from "@/types/contact";

export const getAllContacts = async (userId: string) => {
  // --- FIX: Use getUserCollectionRef for user-specific contacts ---
  const contactsCollection = getUserCollectionRef<Contact>("contacts", userId);
  // --- END FIX ---

  // The where("userId", "==", userId) is now redundant due to the path,
  // but keeping it adds an extra layer of data integrity.
  const q = query(contactsCollection, where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      category: data.category,
      website: data.website ?? null,
      avatarColor: data.avatarColor ?? null,
      userId: data.userId,
      orderIndex: data.orderIndex,
      channel: data.channel,
      isOfficial: data.isOfficial,
    };
  }) as Contact[];
};
