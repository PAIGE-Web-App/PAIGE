// lib/saveContactToFirestore.ts
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase"; // Assuming firebase.ts is in the same lib folder

export const saveContactToFirestore = async (contact: any) => {
  // --- DEBUGGING CONSOLE LOG ---
  console.log("saveContactToFirestore: Attempting to save contact:", contact);
  console.log("saveContactToFirestore: userId being saved:", contact.userId);
  console.log("saveContactToFirestore: contact.id being saved:", contact.id); // ADDED DEBUG LOG
  console.log("saveContactToFirestore: contact.orderIndex being saved:", contact.orderIndex); // ADDED DEBUG LOG
  // --- END DEBUGGING CONSOLE LOG ---

  if (!contact.userId) {
    console.error("saveContactToFirestore: Contact object is missing userId!");
    throw new Error("Contact must have a userId.");
  }
  // Use { merge: true } to ensure that if a document with this ID already exists,
  // new fields are added without overwriting existing ones.
  // This is crucial if you later add message history to the contact document.
  await setDoc(doc(db, "contacts", contact.id), contact, { merge: true });
  console.log("saveContactToFirestore: Document successfully written to Firestore."); // ADDED DEBUG LOG
};
