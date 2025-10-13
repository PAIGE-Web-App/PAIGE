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
 * @param vendor - Vendor object with placeId
 * @param options - Optional configuration (limit: number of images to fetch)
 */
export async function getVendorImages(vendor: any, options?: { limit?: number }): Promise<VendorImageData> {
  const limit = options?.limit || 6; // Default to 6 instead of 16
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

  // Try to fetch from Google Places API with limit
  if (placeId) {
    try {
      const response = await fetch(`/api/vendor-photos/${placeId}?limit=${limit}`);
      const data = await response.json();
      
      if (data.images && data.images.length > 0) {
        // Validate that the URLs are valid
        const validImages = data.images.filter((url: string) => 
          url && typeof url === 'string' && url.startsWith('http')
        );
        
        if (validImages.length > 0) {
          return {
            primaryImage: validImages[0],
            allImages: validImages,
            hasRealImages: true
          };
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching vendor photos:', error);
      }
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
      img && img !== '/Venue.png' && !img.includes('Venue.png') && img.startsWith('http')
    );
    
    if (realImages.length > 0) {
      return realImages[0];
    }
  }

  // Return the vendor's image if it exists and isn't a placeholder
  if (vendor.image && vendor.image !== '/Venue.png' && !vendor.image.includes('Venue.png') && vendor.image.startsWith('http')) {
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
 * Batch enhances multiple vendors with images using intelligent batching
 */
export async function enhanceVendorsWithImages(vendors: any[]): Promise<any[]> {
  if (vendors.length === 0) return [];
  
  // Process vendors in batches to avoid overwhelming the API
  const BATCH_SIZE = 5;
  const batches: any[][] = [];
  
  for (let i = 0; i < vendors.length; i += BATCH_SIZE) {
    batches.push(vendors.slice(i, i + BATCH_SIZE));
  }
  
  const enhanced: any[] = [];
  
  for (const batch of batches) {
    const batchPromises = batch.map(async (vendor) => {
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
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    const batchEnhanced = batchResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Failed to enhance vendor ${batch[index].id}:`, result.reason);
        return batch[index]; // Return original vendor if enhancement fails
      }
    });
    
    enhanced.push(...batchEnhanced);
    
    // Add small delay between batches to prevent rate limiting
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return enhanced;
}

/**
 * Batch loads images for multiple vendors with caching
 */
export async function batchLoadVendorImages(vendors: any[]): Promise<Map<string, VendorImageData>> {
  const results = new Map<string, VendorImageData>();
  
  if (vendors.length === 0) return results;
  
  // Group vendors by their image needs
  const vendorsNeedingImages = vendors.filter(vendor => {
    const placeId = vendor.placeId || vendor.id;
    return placeId && (!vendor.image || vendor.image === '/Venue.png');
  });
  
  if (vendorsNeedingImages.length === 0) {
    // All vendors already have images, return immediate results
    vendors.forEach(vendor => {
      const placeId = vendor.placeId || vendor.id;
      results.set(placeId, {
        primaryImage: vendor.image || '/Venue.png',
        allImages: vendor.images || [vendor.image || '/Venue.png'],
        hasRealImages: vendor.image && !vendor.image.includes('Venue.png')
      });
    });
    return results;
  }
  
  // Process in smaller batches to avoid rate limiting
  const BATCH_SIZE = 3;
  const batches: any[][] = [];
  
  for (let i = 0; i < vendorsNeedingImages.length; i += BATCH_SIZE) {
    batches.push(vendorsNeedingImages.slice(i, i + BATCH_SIZE));
  }
  
  for (const batch of batches) {
    const batchPromises = batch.map(async (vendor) => {
      const placeId = vendor.placeId || vendor.id;
      try {
        const imageData = await getVendorImages(vendor);
        results.set(placeId, imageData);
      } catch (error) {
        console.error(`Error loading images for vendor ${placeId}:`, error);
        // Fallback to placeholder
        results.set(placeId, {
          primaryImage: '/Venue.png',
          allImages: ['/Venue.png'],
          hasRealImages: false
        });
      }
    });
    
    await Promise.allSettled(batchPromises);
    
    // Add delay between batches
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  // Add vendors that already have images
  vendors.forEach(vendor => {
    const placeId = vendor.placeId || vendor.id;
    if (!results.has(placeId)) {
      results.set(placeId, {
        primaryImage: vendor.image || '/Venue.png',
        allImages: vendor.images || [vendor.image || '/Venue.png'],
        hasRealImages: vendor.image && !vendor.image.includes('Venue.png')
      });
    }
  });
  
  return results;
} 