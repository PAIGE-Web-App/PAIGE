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
      isOfficial: data.isOfficial,
      // Add vendor association fields
      placeId: data.placeId ?? null,
      isVendorContact: data.isVendorContact ?? false,
      vendorEmails: data.vendorEmails ?? [],
    };
  }) as Contact[];
};

// New function to get vendors from the vendor management collection
export const getAllVendors = async (userId: string) => {
  const vendorsCollection = getUserCollectionRef<any>("vendors", userId);
  const q = query(vendorsCollection, where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  const vendors = querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      placeId: data.placeId,
      category: data.category,
      website: data.website ?? null,
      phone: data.phone ?? null,
      address: data.address,
      userId: data.userId,
      isOfficial: data.isOfficial ?? false,
      selectedAsVenue: data.selectedAsVenue ?? false,
      selectedAsVendor: data.selectedAsVendor ?? false,
      addedAt: data.addedAt,
      rating: data.rating ?? null,
      reviewCount: data.reviewCount ?? null,
      vicinity: data.vicinity ?? null,
      types: data.types ?? [],
      image: data.image ?? '/Venue.png', // Include the image field from Firestore
      // For compatibility with existing UI, add these fields
      email: null, // Vendors don't have direct email in management system
      avatarColor: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`, // Generate consistent color
      orderIndex: data.addedAt ? -new Date(data.addedAt).getTime() : 0, // Sort by added date
    };
  });
  
  // Sort vendors by most recently added first
  const sortedVendors = vendors.sort((a, b) => {
    // Use orderIndex if available (negative timestamp for recent first)
    if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
      return a.orderIndex - b.orderIndex;
    }
    
    // Fallback to addedAt timestamp
    const aTime = a.addedAt ? new Date(a.addedAt).getTime() : 0;
    const bTime = b.addedAt ? new Date(b.addedAt).getTime() : 0;
    return bTime - aTime; // Most recent first
  });
  
  console.log('Fetched vendors for user:', userId, sortedVendors);
  return sortedVendors;
};
