// Unified vendor image handling utility
// This ensures consistent image display across all vendor components

export interface VendorImageData {
  primaryImage: string;
  allImages: string[];
  hasRealImages: boolean;
}

/**
 * Fetches the best available image for a vendor
 * Priority: Google Places API > Recently Viewed > Placeholder
 */
export async function getVendorImages(vendor: any): Promise<VendorImageData> {
  const placeId = vendor.placeId || vendor.id;
  
  // If vendor already has a valid Google Places image, use it
  if (vendor.image && vendor.image.includes('maps.googleapis.com')) {
    return {
      primaryImage: vendor.image,
      allImages: vendor.images || [vendor.image],
      hasRealImages: true
    };
  }

  // If vendor has multiple images, use the first non-placeholder
  if (vendor.images && vendor.images.length > 0) {
    const realImages = vendor.images.filter((img: string) => 
      img && img !== '/Venue.png' && !img.includes('Venue.png')
    );
    
    if (realImages.length > 0) {
      return {
        primaryImage: realImages[0],
        allImages: realImages,
        hasRealImages: true
      };
    }
  }

  // Try to fetch from Google Places API
  if (placeId) {
    try {
      const response = await fetch(`/api/vendor-photos/${placeId}`);
      const data = await response.json();
      
      if (data.images && data.images.length > 0) {
        return {
          primaryImage: data.images[0],
          allImages: data.images,
          hasRealImages: true
        };
      }
    } catch (error) {
      console.error('Error fetching vendor photos:', error);
    }
  }

  // Fallback to placeholder
  return {
    primaryImage: '/Venue.png',
    allImages: ['/Venue.png'],
    hasRealImages: false
  };
}

/**
 * Gets the best image for a vendor without making API calls
 * Used for immediate display while fetching better images
 */
export function getVendorImageImmediate(vendor: any): string {
  // If vendor has a valid Google Places image, use it
  if (vendor.image && vendor.image.includes('maps.googleapis.com')) {
    return vendor.image;
  }

  // If vendor has multiple images, use the first non-placeholder
  if (vendor.images && vendor.images.length > 0) {
    const realImages = vendor.images.filter((img: string) => 
      img && img !== '/Venue.png' && !img.includes('Venue.png')
    );
    
    if (realImages.length > 0) {
      return realImages[0];
    }
  }

  // Return the vendor's image if it exists and isn't a placeholder
  if (vendor.image && vendor.image !== '/Venue.png' && !vendor.image.includes('Venue.png')) {
    return vendor.image;
  }

  // Fallback to placeholder
  return '/Venue.png';
}

/**
 * Checks if an image URL is a placeholder
 */
export function isPlaceholderImage(imageUrl: string): boolean {
  return !imageUrl || 
         imageUrl === '/Venue.png' || 
         imageUrl.includes('Venue.png') ||
         imageUrl === '';
}

/**
 * Enhances a vendor object with the best available images
 */
export async function enhanceVendorWithImages(vendor: any): Promise<any> {
  const imageData = await getVendorImages(vendor);
  
  return {
    ...vendor,
    image: imageData.primaryImage,
    images: imageData.allImages,
    hasRealImages: imageData.hasRealImages
  };
}

/**
 * Batch enhances multiple vendors with images
 */
export async function enhanceVendorsWithImages(vendors: any[]): Promise<any[]> {
  const enhanced = await Promise.all(
    vendors.map(async (vendor) => {
      try {
        return await enhanceVendorWithImages(vendor);
      } catch (error) {
        console.error('Error enhancing vendor with images:', error);
        return {
          ...vendor,
          image: getVendorImageImmediate(vendor),
          hasRealImages: false
        };
      }
    })
  );

  return enhanced;
} 