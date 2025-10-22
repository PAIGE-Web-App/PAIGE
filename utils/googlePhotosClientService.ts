/**
 * Client-Side Google Photos API Service
 * 
 * This service handles all Google Photos API operations directly from the browser,
 * bypassing Vercel's restrictions on server-side external API calls.
 * 
 * Benefits:
 * - Faster performance (no server round-trip)
 * - Better reliability (bypasses Vercel restrictions)
 * - More responsive (direct API calls)
 * - Better error handling (direct Google API responses)
 */

// Extend Window interface for Google API
declare global {
  interface Window {
    gapi: any;
  }
}

interface PhotosSearchParams {
  placeId: string;
  limit?: number;
  maxWidth?: number;
  maxHeight?: number;
}

interface PhotosSearchResult {
  success: boolean;
  images?: string[];
  totalAvailable?: number;
  error?: string;
  errorType?: string;
}

interface PlaceDetailsResult {
  success: boolean;
  place?: any;
  photos?: any[];
  error?: string;
  errorType?: string;
}

class GooglePhotosClientService {
  private static instance: GooglePhotosClientService;
  private googleApiLoaded = false;
  private gapi: any = null;

  private constructor() {}

  public static getInstance(): GooglePhotosClientService {
    if (!GooglePhotosClientService.instance) {
      GooglePhotosClientService.instance = new GooglePhotosClientService();
    }
    return GooglePhotosClientService.instance;
  }

  /**
   * Initialize Google API client
   */
  private async initializeGoogleApi(): Promise<boolean> {
    if (this.googleApiLoaded && this.gapi) {
      return true;
    }

    try {
      // Load Google API script if not already loaded
      if (!window.gapi) {
        await this.loadGoogleApiScript();
      }

      this.gapi = window.gapi;
      
      // Initialize the client
      await this.gapi.load('client', async () => {
        await this.gapi.client.init({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/places/v1/rest'],
        });
      });

      this.googleApiLoaded = true;
      console.log('✅ Google Photos API initialized successfully');
      return true;
    } catch (error: any) {
      console.error('❌ Failed to initialize Google Photos API:', error);
      return false;
    }
  }

  /**
   * Load Google API script dynamically
   */
  private loadGoogleApiScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API script'));
      document.head.appendChild(script);
    });
  }

  /**
   * Check if Google Photos API is available and configured
   */
  public async isPhotosAvailable(): Promise<boolean> {
    try {
      const initialized = await this.initializeGoogleApi();
      return initialized && !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    } catch (error) {
      console.error('❌ Google Photos API not available:', error);
      return false;
    }
  }

  /**
   * Search for photos by place ID
   */
  public async searchPhotos(params: PhotosSearchParams): Promise<PhotosSearchResult> {
    try {
      console.log('🖼️ Searching for photos via client-side API...', params);
      
      const initialized = await this.initializeGoogleApi();
      if (!initialized) {
        return {
          success: false,
          error: 'Google Photos API not available',
          errorType: 'api_unavailable'
        };
      }

      const { placeId, limit = 6, maxWidth = 400, maxHeight = 400 } = params;

      if (!placeId) {
        return {
          success: false,
          error: 'Place ID is required',
          errorType: 'missing_place_id'
        };
      }

      // First get the place details to get photo references
      const placeDetailsResponse = await this.gapi.client.places.placeDetails({
        placeId: placeId,
        fields: 'photos',
      });

      if (!placeDetailsResponse.result?.photos || placeDetailsResponse.result.photos.length === 0) {
        return {
          success: true,
          images: [],
          totalAvailable: 0
        };
      }

      // Generate photo URLs
      const photoUrls = placeDetailsResponse.result.photos
        .slice(0, Math.min(limit, 16)) // Max 16 photos
        .map((photo: any) => {
          const baseUrl = 'https://maps.googleapis.com/maps/api/place/photo';
          const params = new URLSearchParams({
            maxwidth: maxWidth.toString(),
            maxheight: maxHeight.toString(),
            photoreference: photo.photo_reference,
            key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
          });
          return `${baseUrl}?${params.toString()}`;
        });

      console.log(`✅ Found ${photoUrls.length} photos for place ${placeId}`);

      return {
        success: true,
        images: photoUrls,
        totalAvailable: placeDetailsResponse.result.photos.length
      };

    } catch (error: any) {
      console.error('❌ Google Photos search failed:', error);
      
      let errorType = 'unknown';
      if (error.message?.includes('INVALID_REQUEST')) {
        errorType = 'invalid_request';
      } else if (error.message?.includes('NOT_FOUND')) {
        errorType = 'place_not_found';
      } else if (error.message?.includes('quota')) {
        errorType = 'quota_exceeded';
      } else if (error.message?.includes('permission')) {
        errorType = 'permission_denied';
      }

      return {
        success: false,
        error: error.message || 'Failed to search photos',
        errorType
      };
    }
  }

  /**
   * Get place details with photos
   */
  public async getPlaceDetails(placeId: string): Promise<PlaceDetailsResult> {
    try {
      console.log('🔍 Getting place details via client-side API...', placeId);
      
      const initialized = await this.initializeGoogleApi();
      if (!initialized) {
        return {
          success: false,
          error: 'Google Photos API not available',
          errorType: 'api_unavailable'
        };
      }

      if (!placeId) {
        return {
          success: false,
          error: 'Place ID is required',
          errorType: 'missing_place_id'
        };
      }

      // Get comprehensive place details
      const placeDetailsResponse = await this.gapi.client.places.placeDetails({
        placeId: placeId,
        fields: 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,photos,opening_hours,reviews',
      });

      if (!placeDetailsResponse.result) {
        return {
          success: false,
          error: 'Place not found',
          errorType: 'place_not_found'
        };
      }

      console.log(`✅ Retrieved place details for ${placeDetailsResponse.result.name}`);

      return {
        success: true,
        place: placeDetailsResponse.result,
        photos: placeDetailsResponse.result.photos || []
      };

    } catch (error: any) {
      console.error('❌ Failed to get place details:', error);
      
      let errorType = 'unknown';
      if (error.message?.includes('INVALID_REQUEST')) {
        errorType = 'invalid_request';
      } else if (error.message?.includes('NOT_FOUND')) {
        errorType = 'place_not_found';
      } else if (error.message?.includes('quota')) {
        errorType = 'quota_exceeded';
      }

      return {
        success: false,
        error: error.message || 'Failed to get place details',
        errorType
      };
    }
  }

  /**
   * Search for photos with text query
   */
  public async searchPhotosByText(query: string, limit: number = 6): Promise<PhotosSearchResult> {
    try {
      console.log('🔍 Searching photos by text via client-side API...', query);
      
      const initialized = await this.initializeGoogleApi();
      if (!initialized) {
        return {
          success: false,
          error: 'Google Photos API not available',
          errorType: 'api_unavailable'
        };
      }

      if (!query) {
        return {
          success: false,
          error: 'Search query is required',
          errorType: 'missing_query'
        };
      }

      // Search for places first
      const placesResponse = await this.gapi.client.places.textSearch({
        query: query,
        fields: 'place_id,name,photos',
      });

      if (!placesResponse.result?.results || placesResponse.result.results.length === 0) {
        return {
          success: true,
          images: [],
          totalAvailable: 0
        };
      }

      // Get photos from the first few places
      const allPhotos: string[] = [];
      const maxPlaces = Math.min(3, placesResponse.result.results.length);
      
      for (let i = 0; i < maxPlaces; i++) {
        const place = placesResponse.result.results[i];
        if (place.photos && place.photos.length > 0) {
          const placePhotos = place.photos.slice(0, 2).map((photo: any) => {
            const baseUrl = 'https://maps.googleapis.com/maps/api/place/photo';
            const params = new URLSearchParams({
              maxwidth: '400',
              maxheight: '400',
              photoreference: photo.photo_reference,
              key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
            });
            return `${baseUrl}?${params.toString()}`;
          });
          allPhotos.push(...placePhotos);
        }
      }

      const limitedPhotos = allPhotos.slice(0, limit);
      console.log(`✅ Found ${limitedPhotos.length} photos for query "${query}"`);

      return {
        success: true,
        images: limitedPhotos,
        totalAvailable: allPhotos.length
      };

    } catch (error: any) {
      console.error('❌ Failed to search photos by text:', error);
      
      let errorType = 'unknown';
      if (error.message?.includes('INVALID_REQUEST')) {
        errorType = 'invalid_request';
      } else if (error.message?.includes('quota')) {
        errorType = 'quota_exceeded';
      }

      return {
        success: false,
        error: error.message || 'Failed to search photos by text',
        errorType
      };
    }
  }

  /**
   * Fallback to server route if client-side fails
   */
  public async searchPhotosWithFallback(params: PhotosSearchParams): Promise<PhotosSearchResult> {
    try {
      // Try client-side first
      const clientResult = await this.searchPhotos(params);
      if (clientResult.success) {
        console.log('✅ Client-side Google Photos search successful');
        return clientResult;
      }

      console.log('⚠️ Client-side failed, falling back to server route...');
      
      // Fallback to server route
      const response = await fetch(`/api/vendor-photos/${params.placeId}?limit=${params.limit || 6}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Server route failed: ${response.status}`);
      }

      const serverResult = await response.json();
      console.log('✅ Server route Google Photos search successful');
      
      return {
        success: true,
        images: serverResult.images || [],
        totalAvailable: serverResult.totalAvailable || 0
      };

    } catch (error: any) {
      console.error('❌ Both client-side and server-side Google Photos search failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to search photos',
        errorType: 'both_failed'
      };
    }
  }

  /**
   * Get optimized photo URL with caching
   */
  public getOptimizedPhotoUrl(photoReference: string, maxWidth: number = 400, maxHeight: number = 400): string {
    const baseUrl = 'https://maps.googleapis.com/maps/api/place/photo';
    const params = new URLSearchParams({
      maxwidth: maxWidth.toString(),
      maxheight: maxHeight.toString(),
      photoreference: photoReference,
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    });
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Batch search photos for multiple places
   */
  public async batchSearchPhotos(placeIds: string[], limit: number = 3): Promise<{ [placeId: string]: string[] }> {
    const results: { [placeId: string]: string[] } = {};
    
    // Process in parallel with rate limiting
    const batchSize = 3;
    for (let i = 0; i < placeIds.length; i += batchSize) {
      const batch = placeIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (placeId) => {
        try {
          const result = await this.searchPhotos({ placeId, limit });
          results[placeId] = result.success ? (result.images || []) : [];
        } catch (error) {
          console.error(`❌ Failed to get photos for place ${placeId}:`, error);
          results[placeId] = [];
        }
      });
      
      await Promise.all(batchPromises);
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < placeIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const googlePhotosClientService = GooglePhotosClientService.getInstance();

// Export types
export type {
  PhotosSearchParams,
  PhotosSearchResult,
  PlaceDetailsResult,
};
