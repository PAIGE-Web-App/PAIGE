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
      'photographer': ['photographer', 'wedding photographer', 'portrait photographer'],
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
    } else if (specialSearchCategories[category] || specialSearchCategories[category + 's']) {
      // Run multiple targeted queries for special categories
      const queries = specialSearchCategories[category] || specialSearchCategories[category + 's'];
      console.log('Using special search categories for:', category, 'queries:', queries);
      let allResults: any[] = [];
      
      if (searchTerm) {
        // If there's a search term, search for it specifically within the category
        const searchQuery = `${searchTerm} ${queries[0]} ${location}`;
        console.log('Search query with term:', searchQuery);
        let baseUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}`;
        if (minprice !== undefined) baseUrl += `&minprice=${minprice}`;
        if (maxprice !== undefined) baseUrl += `&maxprice=${maxprice}`;
        if (radius !== undefined) baseUrl += `&radius=${radius}`;
        if (opennow) baseUrl += `&opennow=true`;
        baseUrl += `&key=${apiKey}`;
        
        console.log('Search API URL:', baseUrl);
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
      console.log('Using standard search for category:', category);
      let query = searchTerm ? `${searchTerm} ${location}` : location;
      console.log('Google Places API query:', query, 'category:', category);
      
      let baseUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&type=${encodeURIComponent(category)}`;
      if (minprice !== undefined) baseUrl += `&minprice=${minprice}`;
      if (maxprice !== undefined) baseUrl += `&maxprice=${maxprice}`;
      if (radius !== undefined) baseUrl += `&radius=${radius}`;
      if (opennow) baseUrl += `&opennow=true`;
      baseUrl += `&key=${apiKey}`;
      
      console.log('Google Places API URL:', baseUrl);
      const response = await fetch(baseUrl);
      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch from Google Places' }, { status: 500 });
      }
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 