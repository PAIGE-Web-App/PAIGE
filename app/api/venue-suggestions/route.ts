import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection('venueSuggestions').get();
    const suggestions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchTerm, weddingLocation, maxResults = 8 } = await req.json();
    
    if (!searchTerm) {
      return NextResponse.json({ error: 'Missing search term' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Google Places API key' }, { status: 500 });
    }

    // Create multiple search queries to get better venue results
    const searchQueries = [
      `${searchTerm} wedding venue ${weddingLocation}`,
      `${searchTerm} event venue ${weddingLocation}`,
      `${searchTerm} banquet hall ${weddingLocation}`,
      `${searchTerm} reception venue ${weddingLocation}`,
      `${searchTerm} wedding reception ${weddingLocation}`,
      `${searchTerm} event space ${weddingLocation}`,
    ];

    let allVenues: any[] = [];
    const seenPlaceIds = new Set();

    // Search with multiple queries to get comprehensive results
    for (const query of searchQueries) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&type=establishment&key=${apiKey}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (data.results) {
            // Filter out duplicates and add to results
            data.results.forEach((venue: any) => {
              if (!seenPlaceIds.has(venue.place_id)) {
                seenPlaceIds.add(venue.place_id);
                allVenues.push(venue);
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error searching with query "${query}":`, error);
        // Continue with other queries
      }
    }

    // Sort venues by relevance (rating, reviews, etc.)
    allVenues.sort((a, b) => {
      // Prioritize venues with ratings
      if (a.rating && !b.rating) return -1;
      if (!a.rating && b.rating) return 1;
      
      // If both have ratings, sort by rating
      if (a.rating && b.rating) {
        if (a.rating !== b.rating) return b.rating - a.rating;
        // If same rating, sort by number of reviews
        if (a.user_ratings_total && b.user_ratings_total) {
          return b.user_ratings_total - a.user_ratings_total;
        }
      }
      
      return 0;
    });

    // Limit results
    const venues = allVenues.slice(0, maxResults);

    console.log(`Found ${venues.length} venues for "${searchTerm}" near "${weddingLocation}"`);

    return NextResponse.json({ 
      venues,
      searchTerm,
      weddingLocation,
      totalFound: allVenues.length
    });

  } catch (error) {
    console.error('Venue suggestions error:', error);
    return NextResponse.json({ error: 'Failed to fetch venue suggestions' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, approved, rejected } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const db = getAdminDb();
    await db.collection('venueSuggestions').doc(id).update({
      approved: !!approved,
      rejected: !!rejected,
      reviewedAt: new Date().toISOString(),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 