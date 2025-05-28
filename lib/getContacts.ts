// lib/getContacts.ts
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase"; // Assuming firebase.ts is in the same lib folder

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
  const contactsCollection = collection(db, "contacts");
  const q = query(contactsCollection, where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Contact[];
};
