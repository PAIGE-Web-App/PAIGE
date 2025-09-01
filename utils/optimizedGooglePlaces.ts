// utils/optimizedGooglePlaces.ts
// Optimized Google Places API wrapper to reduce costs and improve performance

import { vendorSearchCache } from './vendorSearchCache';

interface SearchParams {
  category: string;
  location: string;
  searchTerm?: string;
  nextPageToken?: string;
  minprice?: number;
  maxprice?: number;
  minrating?: number;
  radius?: number;
  opennow?: boolean;
}

interface SearchResult {
  results: any[];
  next_page_token?: string;
  error?: string;
  fromCache: boolean;
  cacheAge?: number;
}

interface LocationCoordinates {
  lat: number;
  lng: number;
}

class OptimizedGooglePlaces {
  private readonly apiKey: string;
  
  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ Google Places API key not found');
    }
  }
  
  /**
   * Progressive loading: Show cached results immediately, refresh in background
   */
  async searchVendorsProgressive(params: SearchParams): Promise<SearchResult> {
    try {
      // Step 1: Check cache first for immediate results
      const cachedResults = await vendorSearchCache.getCachedResultsSilent(
        params.category,
        params.location,
        this.normalizeFilters(params)
      );
      
      if (cachedResults) {
        console.log(`🚀 Progressive loading: Showing cached results immediately (${cachedResults.results.length} vendors)`);
        
        // Return cached results immediately
        const immediateResult = {
          results: cachedResults.results,
          next_page_token: cachedResults.nextPageToken,
          fromCache: true,
          cacheAge: Date.now() - cachedResults.timestamp
        };
        
        // Step 2: Refresh data in background (non-blocking)
        this.refreshDataInBackground(params).catch(error => {
          console.warn('⚠️ Background refresh failed:', error);
          // Don't fail the main request if background refresh fails
        });
        
        return immediateResult;
      }
      
      // Step 3: If no cache, execute normal search
      console.log(`🔄 Progressive loading: No cache, executing normal search`);
      return this.searchVendors(params);
      
    } catch (error) {
      console.error('❌ Error in progressive search:', error);
      // Fallback to normal search if progressive loading fails
      return this.searchVendors(params);
    }
  }
  
  /**
   * Refresh data in background without blocking UI
   */
  private async refreshDataInBackground(params: SearchParams): Promise<void> {
    try {
      console.log(`🔄 Background refresh started for ${params.category} in ${params.location}`);
      
      // Small delay to avoid overwhelming the API
      await this.delay(100);
      
      // Execute search and update cache
      const freshResults = await this.executeOptimizedSearch(params);
      
      if (freshResults.results && !freshResults.error) {
        await vendorSearchCache.cacheResults(
          params.category,
          params.location,
          freshResults.results,
          this.normalizeFilters(params),
          freshResults.next_page_token
        );
        
        console.log(`✅ Background refresh completed: ${freshResults.results.length} vendors updated`);
      }
      
    } catch (error) {
      console.warn('⚠️ Background refresh failed:', error);
      // Background refresh failures don't affect the main request
    }
  }
  
  /**
   * Main search method with intelligent caching
   */
  async searchVendors(params: SearchParams): Promise<SearchResult> {
    try {
      // Step 1: Check cache first
      const cachedResults = await vendorSearchCache.getCachedResults(
        params.category,
        params.location,
        this.normalizeFilters(params)
      );
      
      if (cachedResults) {
        return {
          results: cachedResults.results,
          next_page_token: cachedResults.nextPageToken,
          fromCache: true,
          cacheAge: Date.now() - cachedResults.timestamp
        };
      }
      
      // Step 2: Check if we have recent results for similar searches
      if (vendorSearchCache.hasRecentResults(params.category, params.location)) {
        console.log(`🔄 Using recent results for ${params.category} in ${params.location}`);
        // Return empty results to trigger a refresh but avoid expensive API calls
        return {
          results: [],
          fromCache: false
        };
      }
      
      // Step 3: Execute optimized API search
      const apiResults = await this.executeOptimizedSearch(params);
      
      // Step 4: Cache the results
      if (apiResults.results && !apiResults.error) {
        await vendorSearchCache.cacheResults(
          params.category,
          params.location,
          apiResults.results,
          this.normalizeFilters(params),
          apiResults.next_page_token
        );
      }
      
      return {
        ...apiResults,
        fromCache: false
      };
      
    } catch (error) {
      console.error('❌ Error in optimized Google Places search:', error);
      return {
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        fromCache: false
      };
    }
  }
  
  /**
   * Execute the actual API search with optimization strategies
   */
  private async executeOptimizedSearch(params: SearchParams): Promise<SearchResult> {
    // Handle pagination tokens (no caching needed)
    if (params.nextPageToken) {
      return this.executePaginationSearch(params.nextPageToken);
    }

    // Use different strategies based on category type
    if (this.isVenueCategory(params.category)) {
      return this.executeVenueSearch(params);
    } else if (this.isSpecialSearchCategory(params.category)) {
      return this.executeSpecialCategorySearch(params);
    } else {
      return this.executeStandardSearch(params);
    }
  }

  /**
   * Check if category needs special search handling
   */
  private isSpecialSearchCategory(category: string): boolean {
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
    
    return category in specialSearchCategories || (category + 's') in specialSearchCategories;
  }

  /**
   * Execute special category search with proper type filtering
   */
  private async executeSpecialCategorySearch(params: SearchParams): Promise<SearchResult> {
    console.log(`🎯 Executing special category search for ${params.category}`);
    
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
    
    const queries = specialSearchCategories[params.category] || specialSearchCategories[params.category + 's'] || [];
    let allResults: any[] = [];
    
    // CRITICAL FIX: Use the same search strategy as the original working implementation
    // First try nearbysearch with the specific type for better filtering
    try {
      const coordinates = await this.geocodeLocation(params.location);
      if (coordinates) {
        // Use the correct Google Places API type for nearby search
        let nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coordinates.lat},${coordinates.lng}&radius=${params.radius || 50000}&key=${this.apiKey}`;
        
        // Add type parameter for categories that have valid Google Places API types
        if (['florist', 'jewelry_store', 'beauty_salon', 'spa', 'car_rental', 'bakery'].includes(params.category)) {
          nearbyUrl += `&type=${encodeURIComponent(params.category)}`;
        }
        
        if (params.minprice !== undefined) nearbyUrl += `&minprice=${params.minprice}`;
        if (params.maxprice !== undefined) nearbyUrl += `&maxprice=${params.maxprice}`;
        if (params.opennow) nearbyUrl += `&opennow=true`;
        
        console.log(`🔍 Nearby search URL: ${nearbyUrl}`);
        const response = await fetch(nearbyUrl);
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.results)) {
            allResults = allResults.concat(data.results);
            console.log(`✅ Nearby search returned ${data.results.length} results`);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Nearby search failed, falling back to text search:', error);
    }
    
    // Use text search with predefined queries - CRITICAL FIX: Make queries more specific
    for (const query of queries) {
      try {
        // CRITICAL FIX: Make the search query more specific by including location
        const searchQuery = `${query} ${params.location}`;
        const searchUrl = this.buildTextSearchUrl(searchQuery, params);
        
        console.log(`🔍 Text search query: "${searchQuery}"`);
        const response = await fetch(searchUrl);
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.results)) {
            allResults = allResults.concat(data.results);
            console.log(`✅ Text search for "${query}" returned ${data.results.length} results`);
          }
        }
        
        // Small delay between API calls
        if (queries.indexOf(query) < queries.length - 1) {
          await this.delay(100);
        }
        
      } catch (error) {
        console.warn(`⚠️ Error in special category search query "${query}":`, error);
      }
    }
    
    console.log(`📊 Total results before filtering: ${allResults.length}`);
    
    // Deduplicate and filter results by category
    const dedupedResults = this.deduplicateResults(allResults);
    console.log(`📊 Results after deduplication: ${dedupedResults.length}`);
    
    const filteredResults = this.filterResultsByCategory(dedupedResults, params.category);
    console.log(`📊 Results after category filtering: ${filteredResults.length}`);
    
    return {
      results: filteredResults,
      fromCache: false
    };
  }
  
  /**
   * Execute venue search with reduced API calls
   */
  private async executeVenueSearch(params: SearchParams): Promise<SearchResult> {
    console.log(`🏗️ Executing optimized venue search for ${params.category}`);
    
    // Instead of 6+ API calls, use 2-3 targeted calls
    const primaryQueries = [
      'wedding venue',
      'banquet hall',
      'event space'
    ];
    
    let allResults: any[] = [];
    
    for (const query of primaryQueries) {
      try {
        const searchUrl = this.buildTextSearchUrl(query, params);
        const response = await fetch(searchUrl);
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.results)) {
            allResults = allResults.concat(data.results);
          }
        }
        
        // Small delay between API calls to be respectful
        if (primaryQueries.indexOf(query) < primaryQueries.length - 1) {
          await this.delay(100);
        }
        
      } catch (error) {
        console.warn(`⚠️ Error in venue search query "${query}":`, error);
        // Continue with other queries
      }
    }
    
    // Deduplicate and filter results
    const dedupedResults = this.deduplicateResults(allResults);
    const filteredResults = this.filterResultsByCategory(dedupedResults, params.category);
    
    return {
      results: filteredResults,
      fromCache: false
    };
  }
  
  /**
   * Execute standard category search with geocoding optimization
   */
  private async executeStandardSearch(params: SearchParams): Promise<SearchResult> {
    console.log(`🔍 Executing optimized standard search for ${params.category}`);
    
    let allResults: any[] = [];
    
    // Step 1: Try to get cached location coordinates
    let coordinates = await vendorSearchCache.getCachedLocation(params.location);
    
    // Step 2: If no cached coordinates, geocode the location
    if (!coordinates) {
      coordinates = await this.geocodeLocation(params.location);
      if (coordinates) {
        await vendorSearchCache.cacheLocation(params.location, coordinates);
      }
    }
    
    // Step 3: Execute search based on available data
    if (coordinates) {
      // Use nearby search for better results
      const nearbyResults = await this.executeNearbySearch(params, coordinates);
      allResults = allResults.concat(nearbyResults);
    }
    
    // Step 4: If we have a search term, also do a text search
    if (params.searchTerm) {
      const textResults = await this.executeTextSearch(params);
      allResults = allResults.concat(textResults);
    }
    
    // Step 5: If no coordinates and no search term, fall back to text search
    if (!coordinates && !params.searchTerm) {
      const fallbackResults = await this.executeTextSearch(params);
      allResults = allResults.concat(fallbackResults);
    }
    
    // Deduplicate and filter results
    const dedupedResults = this.deduplicateResults(allResults);
    const filteredResults = this.filterResultsByCategory(dedupedResults, params.category);
    
    return {
      results: filteredResults,
      fromCache: false
    };
  }
  
  /**
   * Execute pagination search (no caching needed)
   */
  private async executePaginationSearch(nextPageToken: string): Promise<SearchResult> {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${nextPageToken}&key=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        return {
          results: data.results || [],
          next_page_token: data.next_page_token,
          fromCache: false
        };
      }
    } catch (error) {
      console.error('❌ Error in pagination search:', error);
    }
    
    return {
      results: [],
      fromCache: false
    };
  }
  
  /**
   * Execute nearby search using coordinates
   */
  private async executeNearbySearch(params: SearchParams, coordinates: LocationCoordinates): Promise<any[]> {
    const nearbyUrl = this.buildNearbySearchUrl(coordinates, params);
    
    try {
      const response = await fetch(nearbyUrl);
      if (response.ok) {
        const data = await response.json();
        return data.results || [];
      }
    } catch (error) {
      console.error('❌ Error in nearby search:', error);
    }
    
    return [];
  }
  
  /**
   * Execute text search
   */
  private async executeTextSearch(params: SearchParams): Promise<any[]> {
    const searchQuery = params.searchTerm 
      ? `${params.searchTerm} ${params.location}`
      : `${params.category} ${params.location}`;
    
    const searchUrl = this.buildTextSearchUrl(searchQuery, params);
    
    try {
      const response = await fetch(searchUrl);
      if (response.ok) {
        const data = await response.json();
        return data.results || [];
      }
    } catch (error) {
      console.error('❌ Error in text search:', error);
    }
    
    return [];
  }
  
  /**
   * Geocode location (expensive operation, use sparingly)
   */
  private async geocodeLocation(location: string): Promise<LocationCoordinates | null> {
    console.log(`🌍 Geocoding location: ${location}`);
    
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${this.apiKey}`;
    
    try {
      const response = await fetch(geocodeUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const coords = data.results[0].geometry.location;
          return { lat: coords.lat, lng: coords.lng };
        }
      }
    } catch (error) {
      console.error('❌ Error geocoding location:', error);
    }
    
    return null;
  }
  
  /**
   * Build text search URL with parameters
   */
  private buildTextSearchUrl(query: string, params: SearchParams): string {
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}`;
    
    // Don't use type parameter for text search as it can cause issues
    // The query itself should contain the category information
    // This is the CRITICAL FIX - let the query do the filtering
    
    if (params.minprice !== undefined) url += `&minprice=${params.minprice}`;
    if (params.maxprice !== undefined) url += `&maxprice=${params.maxprice}`;
    if (params.radius !== undefined) url += `&radius=${params.radius}`;
    if (params.opennow) url += `&opennow=true`;
    
    url += `&key=${this.apiKey}`;
    return url;
  }

  /**
   * Build nearby search URL with parameters
   */
  private buildNearbySearchUrl(coordinates: LocationCoordinates, params: SearchParams): string {
    let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coordinates.lat},${coordinates.lng}&radius=${params.radius || 50000}`;
    
    // Don't use type parameter for nearby search as it can cause issues
    // This is the CRITICAL FIX - let the query do the filtering
    
    if (params.minprice !== undefined) url += `&minprice=${params.minprice}`;
    if (params.maxprice !== undefined) url += `&maxprice=${params.maxprice}`;
    if (params.opennow) url += `&opennow=true`;
    
    url += `&key=${this.apiKey}`;
    return url;
  }
  
  /**
   * Check if category is a venue type
   */
  private isVenueCategory(category: string): boolean {
    const venueCategories = [
      'reception_venue', 'wedding_venue', 'banquet_hall', 
      'event_venue', 'reception', 'wedding', 'venue'
    ];
    return venueCategories.includes(category);
  }
  
  /**
   * Normalize filters for consistent caching
   */
  private normalizeFilters(params: SearchParams): Record<string, any> {
    const filters: Record<string, any> = {};
    
    if (params.minprice !== undefined) filters.minprice = params.minprice;
    if (params.maxprice !== undefined) filters.maxprice = params.maxprice;
    if (params.minrating !== undefined) filters.minrating = params.minrating;
    if (params.radius !== undefined) filters.radius = params.radius;
    if (params.opennow) filters.opennow = params.opennow;
    if (params.searchTerm) filters.searchTerm = params.searchTerm;
    
    return filters;
  }
  
  /**
   * Deduplicate results by place_id
   */
  private deduplicateResults(results: any[]): any[] {
    const seen = new Set();
    return results.filter(place => {
      if (!place.place_id || seen.has(place.place_id)) return false;
      seen.add(place.place_id);
      return true;
    });
  }
  
  /**
   * Filter results by category - CRITICAL FIX: Strict wedding vendor filtering
   */
  private filterResultsByCategory(results: any[], category: string): any[] {
    return results.filter(place => {
      // CRITICAL FIX: Be EXTREMELY strict about category filtering
      const placeName = place.name?.toLowerCase() || '';
      const placeTypes = place.types || [];
      
      // BLOCK ALL HOTELS AND VENUES unless specifically searching for venues
      if (this.isHotelOrVenue(placeName, placeTypes) && !this.isVenueCategory(category)) {
        console.log(`🚫 BLOCKED: ${placeName} - appears to be hotel/venue for ${category} search`);
        return false;
      }
      
      // For photographer category, only allow places with photography-related names or types
      if (category === 'photographer') {
        const photographyKeywords = ['photo', 'photography', 'studio', 'camera', 'portrait', 'wedding photo'];
        const hasPhotographyName = photographyKeywords.some(keyword => placeName.includes(keyword));
        const hasPhotographyType = placeTypes.some(type => type.includes('photo') || type.includes('studio'));
        
        // Only return true if it's clearly a photography business
        return hasPhotographyName || hasPhotographyType;
      }
      
      // For florist category, only allow places with flower-related names or types
      if (category === 'florist') {
        const floristKeywords = ['florist', 'flower', 'floral', 'bloom', 'petal', 'bouquet'];
        const hasFloristName = floristKeywords.some(keyword => placeName.includes(keyword));
        const hasFloristType = placeTypes.some(type => type.includes('florist'));
        
        return hasFloristName || hasFloristType;
      }
      
      // For DJ category, only allow places with DJ/music-related names or types
      if (category === 'dj') {
        const djKeywords = ['dj', 'disc jockey', 'music', 'entertainment', 'sound', 'audio', 'wedding dj'];
        const hasDjName = djKeywords.some(keyword => placeName.includes(keyword));
        const hasDjType = placeTypes.some(type => type.includes('establishment'));
        
        // Must have DJ-related name to pass through
        return hasDjName;
      }
      
      // For caterer category, only allow places with food/catering-related names or types
      if (category === 'caterer') {
        const catererKeywords = ['catering', 'caterer', 'food', 'dining', 'cuisine', 'restaurant', 'kitchen'];
        const hasCatererName = catererKeywords.some(keyword => placeName.includes(keyword));
        const hasCatererType = placeTypes.some(type => type.includes('restaurant') || type.includes('food'));
        
        return hasCatererName || hasCatererType;
      }
      
      // For other categories, use the existing logic but be more strict
      if (placeTypes.length > 0) {
        const categoryMapping = this.getCategoryMapping(category);
        const hasMatchingType = categoryMapping.some(type => placeTypes.includes(type));
        
        if (hasMatchingType) {
          return true;
        }
      }
      
      // Check name relevance for categories without clear types
      const categoryKeywords = this.getCategoryKeywords(category);
      const hasRelevantName = categoryKeywords.some(keyword => placeName.includes(keyword));
      
      return hasRelevantName;
    });
  }

  /**
   * Check if a place is a hotel or venue (to block them from non-venue searches)
   */
  private isHotelOrVenue(placeName: string, placeTypes: string[]): boolean {
    const hotelKeywords = ['hotel', 'inn', 'resort', 'lodge', 'suites', 'marriott', 'hilton', 'hyatt', 'aloft', 'magnolia', 'adolphus', 'joule', 'indigo'];
    const venueKeywords = ['venue', 'hall', 'center', 'theatre', 'theater', 'convention', 'conference'];
    
    const hasHotelName = hotelKeywords.some(keyword => placeName.includes(keyword));
    const hasVenueName = venueKeywords.some(keyword => placeName.includes(keyword));
    const hasHotelType = placeTypes.some(type => type.includes('lodging') || type.includes('hotel'));
    
    return hasHotelName || hasVenueName || hasHotelType;
  }

  /**
   * Get Google Places API types for our categories
   */
  private getCategoryMapping(category: string): string[] {
    const categoryMappings = {
      'photographer': ['establishment'], // photographer is not a valid Google Places API type
      'florist': ['florist', 'establishment'],
      'caterer': ['restaurant', 'food', 'establishment'],
      'dj': ['establishment'],
      'band': ['establishment'],
      'wedding_planner': ['establishment'],
      'beauty_salon': ['beauty_salon', 'establishment'],
      'spa': ['spa', 'establishment'],
      'car_rental': ['car_rental', 'establishment'],
      'jewelry_store': ['jewelry_store', 'establishment'],
      'bakery': ['bakery', 'food', 'establishment'],
      'venue': ['establishment'],
      'wedding_venue': ['establishment'],
      'reception_venue': ['establishment']
    };
    
    return categoryMappings[category] || ['establishment'];
  }

  /**
   * Get keywords to check in place names for category relevance
   */
  private getCategoryKeywords(category: string): string[] {
    const categoryKeywords = {
      'photographer': ['photo', 'photography', 'studio', 'camera'],
      'florist': ['flower', 'floral', 'bloom', 'petal'],
      'caterer': ['catering', 'food', 'dining', 'cuisine'],
      'dj': ['dj', 'disc jockey', 'music', 'entertainment'],
      'band': ['band', 'music', 'entertainment', 'live'],
      'wedding_planner': ['wedding', 'planner', 'coordinator', 'event'],
      'beauty_salon': ['beauty', 'salon', 'hair', 'makeup'],
      'spa': ['spa', 'wellness', 'relaxation'],
      'car_rental': ['car', 'rental', 'auto', 'vehicle'],
      'jewelry_store': ['jewelry', 'jewelry', 'ring', 'diamond'],
      'bakery': ['bakery', 'cake', 'pastry', 'bread'],
      'venue': ['venue', 'hall', 'space', 'event'],
      'wedding_venue': ['wedding', 'venue', 'reception', 'hall'],
      'reception_venue': ['reception', 'venue', 'hall', 'event']
    };
    
    return categoryKeywords[category] || [];
  }
  
  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return vendorSearchCache.getStats();
  }
  
  /**
   * Clear cache (for testing/debugging)
   */
  clearCache() {
    vendorSearchCache.clearCache();
  }
}

// Export singleton instance
export const optimizedGooglePlaces = new OptimizedGooglePlaces();

// Export types
export type { SearchParams, SearchResult, LocationCoordinates };
