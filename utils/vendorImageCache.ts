// Lightweight vendor image cache system
// Prevents image discrepancies without heavy cron jobs

interface CachedImageData {
  url: string;
  timestamp: number;
  ttl: number;
  placeId: string;
}

interface ImageValidationResult {
  isValid: boolean;
  needsRefresh: boolean;
  newUrl?: string;
}

class VendorImageCache {
  private static instance: VendorImageCache;
  private cache = new Map<string, CachedImageData>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly VALIDATION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MAX_CACHE_SIZE = 1000;

  static getInstance(): VendorImageCache {
    if (!VendorImageCache.instance) {
      VendorImageCache.instance = new VendorImageCache();
    }
    return VendorImageCache.instance;
  }

  /**
   * Validates and potentially refreshes a vendor image
   * Only makes API calls when absolutely necessary
   */
  async validateVendorImage(vendor: any): Promise<ImageValidationResult> {
    const placeId = vendor.placeId || vendor.id;
    if (!placeId) {
      return { isValid: false, needsRefresh: false };
    }

    const cacheKey = `vendor_image_${placeId}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    // If we have a recent, valid cache entry, use it
    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return { isValid: true, needsRefresh: false };
    }

    // Check if current image is valid
    const currentImage = vendor.image || vendor.images?.[0];
    if (this.isValidGooglePlacesImage(currentImage)) {
      // Cache the valid image
      this.setCache(cacheKey, {
        url: currentImage,
        timestamp: now,
        ttl: this.CACHE_TTL,
        placeId
      });
      return { isValid: true, needsRefresh: false };
    }

    // Only fetch from API if we don't have a valid image
    try {
      const response = await fetch(`/api/vendor-photos/${placeId}`);
      const data = await response.json();
      
      if (data.images && data.images.length > 0) {
        const newUrl = data.images[0];
        this.setCache(cacheKey, {
          url: newUrl,
          timestamp: now,
          ttl: this.CACHE_TTL,
          placeId
        });
        return { isValid: true, needsRefresh: true, newUrl };
      }
    } catch (error) {
      console.error('Error validating vendor image:', error);
    }

    return { isValid: false, needsRefresh: false };
  }

  /**
   * Batch validates multiple vendors efficiently
   */
  async validateVendorImages(vendors: any[]): Promise<Map<string, ImageValidationResult>> {
    const results = new Map<string, ImageValidationResult>();
    const validationPromises: Promise<void>[] = [];

    // Process vendors in parallel with rate limiting
    const batchSize = 5; // Limit concurrent API calls
    for (let i = 0; i < vendors.length; i += batchSize) {
      const batch = vendors.slice(i, i + batchSize);
      const batchPromises = batch.map(async (vendor) => {
        const placeId = vendor.placeId || vendor.id;
        const result = await this.validateVendorImage(vendor);
        results.set(placeId, result);
      });
      
      validationPromises.push(...batchPromises);
      
      // Add small delay between batches to prevent API rate limiting
      if (i + batchSize < vendors.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    await Promise.all(validationPromises);
    return results;
  }

  /**
   * Checks if an image URL is a valid Google Places image
   */
  private isValidGooglePlacesImage(imageUrl: string): boolean {
    if (!imageUrl) return false;
    
    // Must be a Google Places photo URL
    if (!imageUrl.includes('maps.googleapis.com/maps/api/place/photo')) {
      return false;
    }

    // Must have a valid photo_reference
    if (!imageUrl.includes('photo_reference=')) {
      return false;
    }

    // Must not be malformed (no nested URLs)
    if (imageUrl.includes('photoreference=https://maps.googleapis.com')) {
      return false;
    }

    return true;
  }

  /**
   * Sets cache with size management
   */
  private setCache(key: string, data: CachedImageData): void {
    // Remove expired entries first
    this.cleanupExpiredEntries();

    // If cache is full, remove oldest entries
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 20% of entries
      const toRemove = Math.ceil(this.MAX_CACHE_SIZE * 0.2);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }

    this.cache.set(key, data);
  }

  /**
   * Removes expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, data] of this.cache.entries()) {
      if (now - data.timestamp > data.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Gets cache statistics for monitoring
   */
  getCacheStats(): { size: number; hitRate: number; oldestEntry: number } {
    const now = Date.now();
    const entries = Array.from(this.cache.values());
    const oldestEntry = entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0;
    
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for accurate rate
      oldestEntry: oldestEntry ? now - oldestEntry : 0
    };
  }

  /**
   * Clears the cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const vendorImageCache = VendorImageCache.getInstance();

// Utility functions for easy integration
export const validateVendorImage = (vendor: any) => vendorImageCache.validateVendorImage(vendor);
export const validateVendorImages = (vendors: any[]) => vendorImageCache.validateVendorImages(vendors);
export const getImageCacheStats = () => vendorImageCache.getCacheStats(); 