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
}: AddVendorOptions): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    // 1. Add to user's personal vendor list (as a contact)
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
    console.error('Error adding vendor to user and community:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
} 