import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { searchTerm, location, maxResults = 8 } = await req.json();
    
    if (!searchTerm) {
      return NextResponse.json({ error: 'Missing search term' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Google Places API key' }, { status: 500 });
    }

    // Create multiple search queries to get better wedding planner results
    const searchQueries = [
      `${searchTerm} wedding planner ${location || 'United States'}`,
      `${searchTerm} wedding coordinator ${location || 'United States'}`,
      `${searchTerm} wedding consultant ${location || 'United States'}`,
      `${searchTerm} event planner ${location || 'United States'}`,
      `${searchTerm} wedding planning service ${location || 'United States'}`,
    ];

    let allPlanners: any[] = [];
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
            data.results.forEach((planner: any) => {
              if (!seenPlaceIds.has(planner.place_id)) {
                seenPlaceIds.add(planner.place_id);
                allPlanners.push(planner);
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error searching with query "${query}":`, error);
        // Continue with other queries
      }
    }

    // Sort planners by relevance (rating, reviews, etc.)
    allPlanners.sort((a, b) => {
      // Prioritize planners with ratings
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
    const planners = allPlanners.slice(0, maxResults);

    console.log(`Found ${planners.length} wedding planners for "${searchTerm}" near "${location || 'United States'}"`);

    return NextResponse.json({ 
      planners,
      searchTerm,
      location,
      totalFound: allPlanners.length
    });

  } catch (error) {
    console.error('Wedding planner suggestions error:', error);
    return NextResponse.json({ error: 'Failed to fetch wedding planner suggestions' }, { status: 500 });
  }
} 