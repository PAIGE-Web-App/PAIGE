/**
 * Utility functions for venue management and synchronization
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Check if a vendor is the selected venue in wedding settings
 */
export async function isSelectedVenue(userId: string, vendorPlaceId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return false;
    }
    
    const userData = userDoc.data();
    const selectedVenueMetadata = userData.selectedVenueMetadata;
    
    if (!selectedVenueMetadata) {
      return false;
    }
    
    return selectedVenueMetadata.place_id === vendorPlaceId;
  } catch (error) {
    console.error('Error checking if vendor is selected venue:', error);
    return false;
  }
}

/**
 * Get the selected venue metadata from user settings
 */
export async function getSelectedVenueMetadata(userId: string): Promise<any | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return null;
    }
    
    const userData = userDoc.data();
    return userData.selectedVenueMetadata || null;
  } catch (error) {
    console.error('Error getting selected venue metadata:', error);
    return null;
  }
}

/**
 * Clear the selected venue from wedding settings
 */
export async function clearSelectedVenue(userId: string): Promise<boolean> {
  try {
    const { updateDoc } = await import('firebase/firestore');
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      selectedVenueMetadata: null,
      hasVenue: false
    });
    
    return true;
  } catch (error) {
    console.error('Error clearing selected venue:', error);
    return false;
  }
}

/**
 * Update the selected venue in wedding settings
 */
export async function updateSelectedVenue(userId: string, venueMetadata: any): Promise<boolean> {
  try {
    const { updateDoc } = await import('firebase/firestore');
    const userRef = doc(db, 'users', userId);
    
    // Make the venue metadata serializable
    const serializableVenue = {
      place_id: venueMetadata.place_id,
      name: venueMetadata.name,
      formatted_address: venueMetadata.formatted_address,
      website: venueMetadata.website || null,
      formatted_phone_number: venueMetadata.formatted_phone_number || null,
      rating: venueMetadata.rating || null,
      user_ratings_total: venueMetadata.user_ratings_total || null,
      vicinity: venueMetadata.vicinity || null,
      types: venueMetadata.types || [],
      photos: venueMetadata.photos || []
    };
    
    await updateDoc(userRef, {
      selectedVenueMetadata: serializableVenue,
      hasVenue: true
    });
    
    return true;
  } catch (error) {
    console.error('Error updating selected venue:', error);
    return false;
  }
}
