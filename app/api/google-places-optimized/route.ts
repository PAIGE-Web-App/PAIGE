import { NextRequest, NextResponse } from 'next/server';
import { optimizedGooglePlaces } from '@/utils/optimizedGooglePlaces';

export async function POST(req: NextRequest) {
  try {
    const { category, location, searchTerm, nextPageToken, minprice, maxprice, minrating, radius, opennow } = await req.json();
    
    // Validate required parameters (same as original endpoint)
    if (!category || !location) {
      return NextResponse.json({ error: 'Missing category or location' }, { status: 400 });
    }

    // Check API key (same as original endpoint)
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Google Places API key' }, { status: 500 });
    }

    console.log(`🚀 Optimized Google Places search: ${category} in ${location}`);

    // Use our optimized search wrapper
    const searchParams = {
      category,
      location,
      searchTerm,
      nextPageToken,
      minprice,
      maxprice,
      minrating,
      radius,
      opennow
    };

    const result = await optimizedGooglePlaces.searchVendors(searchParams);

    // Return results in the exact same format as the original endpoint
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Add cache information to response headers for debugging
    const headers = new Headers();
    if (result.fromCache) {
      headers.set('X-Cache-Hit', 'true');
      if (result.cacheAge) {
        headers.set('X-Cache-Age', result.cacheAge.toString());
      }
    } else {
      headers.set('X-Cache-Hit', 'false');
    }

    // Return the same response format as original endpoint
    const response = {
      results: result.results,
      next_page_token: result.next_page_token
    };

    console.log(`✅ Optimized search completed: ${result.results.length} results${result.fromCache ? ' (from cache)' : ''}`);

    return NextResponse.json(response, { headers });

  } catch (error) {
    console.error('❌ Error in optimized Google Places API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}

