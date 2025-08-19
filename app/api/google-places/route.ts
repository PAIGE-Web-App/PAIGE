import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { category, location, searchTerm, nextPageToken, minprice, maxprice, minrating, radius, opennow } = await req.json();
    
  
    
    if (!category || !location) {
  
      return NextResponse.json({ error: 'Missing category or location' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Google Places API key' }, { status: 500 });
    }

    // Use more targeted queries for wedding/reception venues
    const venueCategories = [
      'reception_venue', 'wedding_venue', 'banquet_hall', 'event_venue', 'reception', 'wedding', 'venue'
    ];

    // Categories that need special search queries (no direct Google Places API type)
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
    
    let url;
    if (nextPageToken) {
      url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${nextPageToken}&key=${apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch from Google Places' }, { status: 500 });
      }
      const data = await response.json();
      return NextResponse.json(data);
    } else if (venueCategories.includes(category)) {
      
      // Run multiple queries and merge results for venues
      const queries = [
        'wedding venue',
        'banquet hall',
        'event space',
        'reception hall',
        'wedding reception',
        'wedding event venue'
      ];
      
      let allResults: any[] = [];
      for (const q of queries) {
        let baseUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q + ' ' + location)}&type=${encodeURIComponent(category)}`;
        if (minprice !== undefined) baseUrl += `&minprice=${minprice}`;
        if (maxprice !== undefined) baseUrl += `&maxprice=${maxprice}`;
        if (radius !== undefined) baseUrl += `&radius=${radius}`;
        if (opennow) baseUrl += `&opennow=true`;
        baseUrl += `&key=${apiKey}`;
        
        const response = await fetch(baseUrl);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.results)) {

            allResults = allResults.concat(data.results);
          } else {

          }
        } else {
          
        }
      }
      
      // Deduplicate by place_id
      const seen = new Set();
      const deduped = allResults.filter(place => {
        if (!place.place_id || seen.has(place.place_id)) return false;
        seen.add(place.place_id);
        return true;
      });
      
      return NextResponse.json({ results: deduped });
    } else if (specialSearchCategories[category] || specialSearchCategories[category + 's']) {
      // Run multiple targeted queries for special categories
      const queries = specialSearchCategories[category] || specialSearchCategories[category + 's'];
      let allResults: any[] = [];
      
      if (searchTerm) {
        // If there's a search term, search for it specifically within the category
        const searchQuery = `${searchTerm} ${queries[0]} ${location}`;
        let baseUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}`;
        if (minprice !== undefined) baseUrl += `&minprice=${minprice}`;
        if (maxprice !== undefined) baseUrl += `&maxprice=${maxprice}`;
        if (radius !== undefined) baseUrl += `&radius=${radius}`;
        if (opennow) baseUrl += `&opennow=true`;
        baseUrl += `&key=${apiKey}`;
        
        const response = await fetch(baseUrl);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.results)) {
            allResults = allResults.concat(data.results);
          }
        }
      } else {
        // If no search term, use the predefined queries
        for (const q of queries) {
          let baseUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q + ' ' + location)}`;
          if (minprice !== undefined) baseUrl += `&minprice=${minprice}`;
          if (maxprice !== undefined) baseUrl += `&maxprice=${maxprice}`;
          if (radius !== undefined) baseUrl += `&radius=${radius}`;
          if (opennow) baseUrl += `&opennow=true`;
          baseUrl += `&key=${apiKey}`;
          const response = await fetch(baseUrl);
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.results)) {
              allResults = allResults.concat(data.results);
            }
          }
        }
      }
      // Deduplicate by place_id
      const seen = new Set();
      const deduped = allResults.filter(place => {
        if (!place.place_id || seen.has(place.place_id)) return false;
        seen.add(place.place_id);
        return true;
      });
      return NextResponse.json({ results: deduped });
    } else {
      // For standard categories with direct Google Places API types
      let allResults: any[] = [];
      
      if (searchTerm) {
        // First, try to find the specific business by name
        const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchTerm)}&inputtype=textquery&fields=place_id,name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,photos,types&key=${apiKey}`;
        const findResponse = await fetch(findPlaceUrl);
        if (findResponse.ok) {
          const findData = await findResponse.json();
          if (findData.candidates && findData.candidates.length > 0) {
            // Check if the found place matches our category
            const candidate = findData.candidates[0];
            if (candidate.types && candidate.types.includes(category)) {
              allResults.push(candidate);
            }
          }
        }
        
        // Also search for category-specific results
        const searchQuery = `${searchTerm} ${location}`;
        let baseUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&type=${encodeURIComponent(category)}`;
        if (minprice !== undefined) baseUrl += `&minprice=${minprice}`;
        if (maxprice !== undefined) baseUrl += `&maxprice=${maxprice}`;
        if (radius !== undefined) baseUrl += `&radius=${radius}`;
        if (opennow) baseUrl += `&opennow=true`;
        baseUrl += `&key=${apiKey}`;
        
        const response = await fetch(baseUrl);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.results)) {
            allResults = allResults.concat(data.results);
          }
        }
      } else {
        // If no search term, use nearbysearch for better category filtering
        // First, get coordinates for the location
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
        const geocodeResponse = await fetch(geocodeUrl);
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();
          if (geocodeData.results && geocodeData.results.length > 0) {
            const location = geocodeData.results[0].geometry.location;
            const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&type=${encodeURIComponent(category)}&radius=50000&key=${apiKey}`;
            const nearbyResponse = await fetch(nearbyUrl);
            if (nearbyResponse.ok) {
              const nearbyData = await nearbyResponse.json();
              if (Array.isArray(nearbyData.results)) {
                allResults = allResults.concat(nearbyData.results);
              }
            }
          }
        }
      }
      
      // Deduplicate by place_id and filter by category
      const seen = new Set();
      const deduped = allResults.filter(place => {
        if (!place.place_id || seen.has(place.place_id)) return false;
        seen.add(place.place_id);
        
        // Additional category filtering for better results
        if (place.types && place.types.includes(category)) {
          return true;
        }
        
        // For search terms, be more lenient but still filter
        if (searchTerm) {
          return true;
        }
        
        return false;
      });
      
      return NextResponse.json({ results: deduped });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 