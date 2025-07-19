// lib/saveContactToFirestore.ts
import { doc, setDoc } from "firebase/firestore";
import { db, getUserCollectionRef } from "./firebase"; // Import getUserCollectionRef

export const saveContactToFirestore = async (contact: any) => {
  // --- DEBUGGING CONSOLE LOG ---
  console.log("saveContactToFirestore: Attempting to save contact:", contact);
  console.log("saveContactToFirestore: userId being saved:", contact.userId);
  console.log("saveContactToFirestore: contact.id being saved:", contact.id);
  console.log("saveContactToFirestore: contact.orderIndex being saved:", contact.orderIndex);
  // --- END DEBUGGING CONSOLE LOG ---

  if (!contact.userId) {
    console.error("saveContactToFirestore: Contact object is missing userId!");
    throw new Error("Contact must have a userId.");
  }

  try {
    // Use getUserCollectionRef to get the correct document path for the user's contacts
    const contactDocRef = doc(getUserCollectionRef("contacts", contact.userId), contact.id);
    
    // Use { merge: true } to ensure that if a document with this ID already exists,
    // new fields are added without overwriting existing ones.
    // This is crucial if you later add message history to the contact document.
    await setDoc(contactDocRef, contact, { merge: true });
    console.log("saveContactToFirestore: Document successfully written to Firestore.");
  } catch (error) {
    console.error("saveContactToFirestore: Error writing document to Firestore:", error);
    throw error; // Re-throw the error so the calling function can handle it
  }
};

// New function to save vendors to the vendor management collection
export const saveVendorToFirestore = async (vendor: any) => {
  console.log("saveVendorToFirestore: Attempting to save vendor:", vendor);
  console.log("saveVendorToFirestore: userId being saved:", vendor.userId);
  console.log("saveVendorToFirestore: vendor.id being saved:", vendor.id);

  if (!vendor.userId) {
    console.error("saveVendorToFirestore: Vendor object is missing userId!");
    throw new Error("Vendor must have a userId.");
  }

  try {
    // Use getUserCollectionRef to get the correct document path for the user's vendors
    const vendorDocRef = doc(getUserCollectionRef("vendors", vendor.userId), vendor.id);
    
    // Use { merge: true } to ensure that if a document with this ID already exists,
    // new fields are added without overwriting existing ones.
    await setDoc(vendorDocRef, vendor, { merge: true });
    console.log("saveVendorToFirestore: Document successfully written to Firestore.");
  } catch (error) {
    console.error("saveVendorToFirestore: Error writing document to Firestore:", error);
    throw error; // Re-throw the error so the calling function can handle it
  }
};
