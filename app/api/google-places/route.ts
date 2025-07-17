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
      // Run multiple queries and merge results
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
    } else {
      let query = `${searchTerm} ${location}`;
      console.log('Google Places API query:', query);
      let baseUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}`;
      if (minprice !== undefined) baseUrl += `&minprice=${minprice}`;
      if (maxprice !== undefined) baseUrl += `&maxprice=${maxprice}`;
      if (radius !== undefined) baseUrl += `&radius=${radius}`;
      if (opennow) baseUrl += `&opennow=true`;
      baseUrl += `&key=${apiKey}`;
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