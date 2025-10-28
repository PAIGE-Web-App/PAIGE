/**
 * Client-Side Google Places API Service
 * 
 * This service handles all Google Places API operations directly from the browser,
 * bypassing Vercel's restrictions on server-side external API calls.
 * 
 * Benefits:
 * - Faster performance (no server round-trip)
 * - Better reliability (bypasses Vercel restrictions)
 * - More responsive (direct API calls)
 * - Better error handling (direct Google API responses)
 */

interface PlacesSearchParams {
  category: string;
  location: string;
  searchTerm?: string;
  nextPageToken?: string;
  minprice?: number;
  maxprice?: number;
  minrating?: number;
  radius?: number;
  opennow?: boolean;
  maxResults?: number;
}

interface PlacesSearchResult {
  success: boolean;
  results?: any[];
  nextPageToken?: string;
  error?: string;
  errorType?: string;
}

interface PlaceDetailsResult {
  success: boolean;
  place?: any;
  error?: string;
  errorType?: string;
}

export class GooglePlacesClientService {
  private static instance: GooglePlacesClientService;
  private apiKey: string | null = null;

  private constructor() {}

  public static getInstance(): GooglePlacesClientService {
    if (!GooglePlacesClientService.instance) {
      GooglePlacesClientService.instance = new GooglePlacesClientService();
    }
    return GooglePlacesClientService.instance;
  }

  /**
   * Initialize the service with Google Places API key
   */
  public async initialize(): Promise<boolean> {
    try {
      console.log('🔧 Initializing Google Places client service...');
      
      // Get API key from environment (client-side)
      // Use GOOGLE_MAPS_API_KEY as it's the same key for both Maps and Places APIs
      this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;
      
      if (!this.apiKey) {
        console.error('❌ No Google Maps API key found');
        return false;
      }

      console.log('✅ Google Places client service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Places client service:', error);
      return false;
    }
  }

  /**
   * Search for places using Google Places API
   */
  public async searchPlaces(params: PlacesSearchParams): Promise<PlacesSearchResult> {
    try {
      console.log('🔍 Searching Google Places via client-side API:', params);
      
      // Ensure service is initialized
      if (!this.apiKey) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            success: false,
            error: 'Google Places API key not found. Please check your configuration.',
            errorType: 'config'
          };
        }
      }

      // Handle pagination
      if (params.nextPageToken) {
        return await this.searchPlacesWithPagination(params.nextPageToken);
      }

      // Handle different search types
      if (this.isVenueCategory(params.category)) {
        return await this.searchVenues(params);
      } else if (this.isSpecialSearchCategory(params.category)) {
        return await this.searchSpecialCategories(params);
      } else {
        return await this.searchGenericPlaces(params);
      }

    } catch (error: any) {
      console.error('❌ Google Places search error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred during Google Places search.',
        errorType: 'network_error'
      };
    }
  }

  /**
   * Get detailed information about a specific place
   */
  public async getPlaceDetails(placeId: string, fields?: string[]): Promise<PlaceDetailsResult> {
    try {
      console.log('📍 Getting place details via client-side API:', placeId);
      
      // Ensure service is initialized
      if (!this.apiKey) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            success: false,
            error: 'Google Places API key not found. Please check your configuration.',
            errorType: 'config'
          };
        }
      }

      // Build the URL
      const defaultFields = [
        'name', 'formatted_address', 'photos', 'rating', 'user_ratings_total',
        'price_level', 'types', 'website', 'formatted_phone_number',
        'international_phone_number', 'editorial_summary', 'reviews',
        'opening_hours', 'business_status', 'url', 'vicinity'
      ];
      
      const fieldsParam = fields ? fields.join(',') : defaultFields.join(',');
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fieldsParam}&key=${this.apiKey}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Google Places API error:', errorData);
        
        return {
          success: false,
          error: `Google Places API error: ${errorData.error?.message || 'Unknown error'}`,
          errorType: response.status === 401 ? 'auth' : 'api_error'
        };
      }

      const data = await response.json();
      
      if (data.status !== 'OK') {
        return {
          success: false,
          error: `Google Places API error: ${data.error_message || 'Unknown error'}`,
          errorType: 'api_error'
        };
      }

      console.log('✅ Place details retrieved successfully');
      return {
        success: true,
        place: data.result
      };

    } catch (error: any) {
      console.error('❌ Google Places details error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred while fetching place details.',
        errorType: 'network_error'
      };
    }
  }

  /**
   * Search for venues (wedding venues, event venues, etc.)
   */
  private async searchVenues(params: PlacesSearchParams): Promise<PlacesSearchResult> {
    const searchQuery = params.searchTerm 
      ? `${params.searchTerm} ${params.location}` 
      : `wedding venue ${params.location}`;
    
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&type=wedding_venue`;
    
    // Add optional parameters
    if (params.minprice !== undefined) url += `&minprice=${params.minprice}`;
    if (params.maxprice !== undefined) url += `&maxprice=${params.maxprice}`;
    if (params.radius !== undefined) url += `&radius=${params.radius}`;
    if (params.opennow) url += `&opennow=true`;
    url += `&key=${this.apiKey}`;

    console.log(`🎯 Venue search query: ${searchQuery}`);
    return await this.executePlacesSearch(url);
  }

  /**
   * Search for special categories (florists, photographers, etc.)
   */
  private async searchSpecialCategories(params: PlacesSearchParams): Promise<PlacesSearchResult> {
    const specialSearchCategories = {
      'florist': ['florist', 'wedding florist', 'flower shop', 'bridal flowers'],
      'jewelry_store': ['jewelry store', 'jewelry shop', 'wedding rings', 'engagement rings'],
      'bakery': ['bakery', 'wedding cake', 'cake shop', 'pastry shop'],
      'beauty_salon': ['beauty salon', 'salon', 'bridal salon', 'wedding beauty'],
      'spa': ['spa', 'day spa', 'wedding spa', 'bridal spa'],
      'dj': ['dj', 'disc jockey', 'wedding dj', 'mobile dj'],
      'band': ['band', 'wedding band', 'live music', 'musicians'],
      'wedding_planner': ['wedding planner', 'wedding coordinator', 'event planner', 'wedding consultant'],
      'caterer': ['caterer', 'catering', 'wedding catering', 'event catering'],
      'photographer': ['photographer', 'wedding photographer', 'portrait photographer', 'photo studio'],
      'videographer': ['videographer', 'wedding videographer', 'video production', 'wedding video'],
      'hair_care': ['hair salon', 'hair stylist', 'wedding hair', 'bridal hair'],
      'car_rental': ['car rental', 'limousine service', 'wedding transportation', 'luxury car rental'],
      'travel_agency': ['travel agency', 'travel agent', 'honeymoon planning'],
      'officiant': ['officiant', 'wedding officiant', 'minister', 'celebrant', 'wedding ceremony'],
      'suit_rental': ['suit rental', 'tuxedo rental', 'formal wear rental', 'wedding suit rental'],
      'makeup_artist': ['makeup artist', 'wedding makeup', 'bridal makeup', 'beauty artist'],
      'stationery': ['stationery', 'wedding invitations', 'invitation designer', 'wedding stationery'],
      'rentals': ['event rentals', 'party rentals', 'wedding rentals', 'equipment rental'],
      'favors': ['wedding favors', 'party favors', 'wedding gifts', 'bridal favors']
    };

    const queries = specialSearchCategories[params.category] || [];
    let allResults: any[] = [];

    // Try nearby search first for better results
    try {
      const nearbyResults = await this.searchNearby(params);
      if (nearbyResults.success && nearbyResults.results) {
        allResults = allResults.concat(nearbyResults.results);
      }
    } catch (error) {
      console.log('⚠️ Nearby search failed, continuing with text search:', error);
    }

    // Then try text search with multiple queries
    for (const query of queries) {
      let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' ' + params.location)}&type=${encodeURIComponent(params.category)}`;
      
      if (params.minprice !== undefined) url += `&minprice=${params.minprice}`;
      if (params.maxprice !== undefined) url += `&maxprice=${params.maxprice}`;
      if (params.radius !== undefined) url += `&radius=${params.radius}`;
      if (params.opennow) url += `&opennow=true`;
      url += `&key=${this.apiKey}`;

      const result = await this.executePlacesSearch(url);
      if (result.success && result.results) {
        allResults = allResults.concat(result.results);
      }
    }

    // Deduplicate by place_id
    const seen = new Set();
    const deduped = allResults.filter(place => {
      if (!place.place_id || seen.has(place.place_id)) return false;
      seen.add(place.place_id);
      return true;
    });

    // Limit results if specified
    const limitedResults = params.maxResults ? deduped.slice(0, params.maxResults) : deduped;

    return {
      success: true,
      results: limitedResults
    };
  }

  /**
   * Search for generic places
   */
  private async searchGenericPlaces(params: PlacesSearchParams): Promise<PlacesSearchResult> {
    const searchQuery = params.searchTerm 
      ? `${params.searchTerm} ${params.location}` 
      : `${params.category} ${params.location}`;
    
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&type=${encodeURIComponent(params.category)}`;
    
    // Add optional parameters
    if (params.minprice !== undefined) url += `&minprice=${params.minprice}`;
    if (params.maxprice !== undefined) url += `&maxprice=${params.maxprice}`;
    if (params.radius !== undefined) url += `&radius=${params.radius}`;
    if (params.opennow) url += `&opennow=true`;
    url += `&key=${this.apiKey}`;

    return await this.executePlacesSearch(url);
  }

  /**
   * Search nearby places
   */
  private async searchNearby(params: PlacesSearchParams): Promise<PlacesSearchResult> {
    try {
      // First get coordinates for the location
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(params.location)}&key=${this.apiKey}`;
      const geocodeResponse = await fetch(geocodeUrl);
      
      if (!geocodeResponse.ok) {
        throw new Error('Failed to geocode location');
      }

      const geocodeData = await geocodeResponse.json();
      if (!geocodeData.results || geocodeData.results.length === 0) {
        throw new Error('No results found for location');
      }

      const coords = geocodeData.results[0].geometry.location;
      let nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coords.lat},${coords.lng}&type=${encodeURIComponent(params.category)}&radius=${params.radius || 50000}`;
      
      if (params.minprice !== undefined) nearbyUrl += `&minprice=${params.minprice}`;
      if (params.maxprice !== undefined) nearbyUrl += `&maxprice=${params.maxprice}`;
      if (params.opennow) nearbyUrl += `&opennow=true`;
      nearbyUrl += `&key=${this.apiKey}`;

      return await this.executePlacesSearch(nearbyUrl);
    } catch (error) {
      console.error('❌ Nearby search error:', error);
      return {
        success: false,
        error: error.message || 'Failed to search nearby places',
        errorType: 'network_error'
      };
    }
  }

  /**
   * Execute a Google Places API search
   */
  private async executePlacesSearch(url: string): Promise<PlacesSearchResult> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Google Places API error:', errorData);
        
        return {
          success: false,
          error: `Google Places API error: ${errorData.error?.message || 'Unknown error'}`,
          errorType: response.status === 401 ? 'auth' : 'api_error'
        };
      }

      const data = await response.json();
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        return {
          success: false,
          error: `Google Places API error: ${data.error_message || 'Unknown error'}`,
          errorType: 'api_error'
        };
      }

      return {
        success: true,
        results: data.results || [],
        nextPageToken: data.next_page_token
      };

    } catch (error: any) {
      console.error('❌ Google Places search error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred during Google Places search.',
        errorType: 'network_error'
      };
    }
  }

  /**
   * Search with pagination
   */
  private async searchPlacesWithPagination(nextPageToken: string): Promise<PlacesSearchResult> {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${nextPageToken}&key=${this.apiKey}`;
    return await this.executePlacesSearch(url);
  }

  /**
   * Check if category is a venue category
   */
  private isVenueCategory(category: string): boolean {
    const venueCategories = [
      'wedding_venue', 'event_venue', 'banquet_hall', 'reception_venue', 
      'reception', 'wedding', 'venue'
    ];
    return venueCategories.includes(category);
  }

  /**
   * Check if category is a special search category
   */
  private isSpecialSearchCategory(category: string): boolean {
    const specialSearchCategories = [
      'florist', 'jewelry_store', 'bakery', 'beauty_salon', 'spa', 'dj', 'band',
      'wedding_planner', 'caterer', 'photographer', 'videographer', 'hair_care',
      'car_rental', 'travel_agency', 'officiant', 'suit_rental', 'makeup_artist',
      'stationery', 'rentals', 'favors'
    ];
    return specialSearchCategories.includes(category);
  }

  /**
   * Check if Google Places is available
   */
  public async isPlacesAvailable(): Promise<boolean> {
    try {
      const initialized = await this.initialize();
      return initialized;
    } catch (error) {
      console.error('❌ Google Places availability check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const googlePlacesClientService = GooglePlacesClientService.getInstance();
