import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { v4 as uuidv4 } from "uuid";
import type { Contact } from "@/types/contact";

interface VendorMetadata {
  name: string;
  place_id: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  geometry?: {
    location: {
      lat: () => number;
      lng: () => number;
    };
    viewport?: any;
  };
  photos?: Array<{
    height: number;
    width: number;
    html_attributions: string[];
    photo_reference: string;
  }>;
  url?: string;
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
}

interface AddVendorOptions {
  userId: string;
  vendorMetadata: VendorMetadata;
  category?: string;
  selectedAsVenue?: boolean;
  selectedAsVendor?: boolean;
}

export async function addVendorToUserAndCommunity({
  userId,
  vendorMetadata,
  category = "Venue",
  selectedAsVenue = false,
  selectedAsVendor = false
}: AddVendorOptions): Promise<{ success: boolean; vendorId?: string; error?: string }> {
  try {
    // Check if vendor already exists for this user
    const { collection, query, where, getDocs } = await import("firebase/firestore");
    const vendorsRef = collection(db, `users/${userId}/vendors`);
    const q = query(vendorsRef, where("placeId", "==", vendorMetadata.place_id));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Vendor already exists, return the existing vendor ID
      const existingVendor = querySnapshot.docs[0];
      console.log('Vendor already exists, returning existing vendor ID:', existingVendor.id, existingVendor.data());
      return { success: true, vendorId: existingVendor.id };
    }

    // Get main image URL from Google Places photos array if available
    let image = '/Venue.png';
    if (vendorMetadata.photos && vendorMetadata.photos.length > 0) {
      const photoRef = vendorMetadata.photos[0].photo_reference;
      image = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
    }

    // 1. Add to user's vendor management system (NOT as a messaging contact)
    const vendorId = uuidv4();
    const vendorData = {
      id: vendorId,
      name: vendorMetadata.name,
      placeId: vendorMetadata.place_id,
      category,
      website: vendorMetadata.website || vendorMetadata.url || null,
      phone: vendorMetadata.formatted_phone_number || null,
      address: vendorMetadata.formatted_address,
      userId,
      isOfficial: false,
      selectedAsVenue,
      selectedAsVendor,
      addedAt: new Date().toISOString(),
      // Store additional metadata for future use
      rating: vendorMetadata.rating || null,
      reviewCount: vendorMetadata.user_ratings_total || null,
      vicinity: vendorMetadata.vicinity || null,
      types: vendorMetadata.types || [],
      image // Save the main image URL
    };

    console.log('Creating vendor with data:', vendorData);

    // Save vendor to user's vendor management collection
    const vendorRef = doc(db, `users/${userId}/vendors`, vendorId);
    await setDoc(vendorRef, vendorData);

    // 2. Add to community database
    const communityResponse = await fetch('/api/community-vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placeId: vendorMetadata.place_id,
        vendorName: vendorMetadata.name,
        vendorAddress: vendorMetadata.formatted_address,
        vendorCategory: category,
        userId,
        selectedAsVenue,
        selectedAsVendor
      })
    });

    if (!communityResponse.ok) {
      console.error('Failed to add vendor to community database');
      // Don't fail the whole operation if community update fails
    }

    return { success: true, vendorId };
  } catch (error) {
    console.error('Error adding vendor to user and community:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Legacy function for backward compatibility - now creates messaging contacts
export async function addVendorAsContact({
  userId,
  vendorMetadata,
  category = "Venue",
  selectedAsVenue = false,
  selectedAsVendor = false
}: AddVendorOptions): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    // 1. Add to user's personal vendor list (as a contact for messaging)
    const contactId = uuidv4();
    const contactData: Contact = {
      id: contactId,
      name: vendorMetadata.name,
      email: null, // No email yet
      phone: vendorMetadata.formatted_phone_number || null,
      category,
      website: vendorMetadata.website || vendorMetadata.url || null,
      avatarColor: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
      userId,
      orderIndex: -new Date().getTime(), // Sort to top
      isOfficial: false,
      placeId: vendorMetadata.place_id,
      isVendorContact: true,
      vendorEmails: []
    };

    // Save contact to user's collection
    const contactRef = doc(db, `users/${userId}/contacts`, contactId);
    await setDoc(contactRef, contactData);

    // 2. Add to community database
    const communityResponse = await fetch('/api/community-vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placeId: vendorMetadata.place_id,
        vendorName: vendorMetadata.name,
        vendorAddress: vendorMetadata.formatted_address,
        vendorCategory: category,
        userId,
        selectedAsVenue,
        selectedAsVendor
      })
    });

    if (!communityResponse.ok) {
      console.error('Failed to add vendor to community database');
      // Don't fail the whole operation if community update fails
    }

    return { success: true, contactId };
  } catch (error) {
    console.error('Error adding vendor as contact:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
} 