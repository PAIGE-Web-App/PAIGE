// app/api/google-place-details-batch/route.ts
// Batch endpoint for Google Places API to reduce API calls

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { placeIds } = await request.json();

    if (!placeIds || !Array.isArray(placeIds) || placeIds.length === 0) {
      return NextResponse.json(
        { error: 'placeIds array is required' },
        { status: 400 }
      );
    }

    if (placeIds.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 place IDs allowed per batch request' },
        { status: 400 }
      );
    }

    // Validate place IDs
    const validPlaceIds = placeIds.filter(id => 
      typeof id === 'string' && id.trim().length > 0
    );

    if (validPlaceIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid place IDs provided' },
        { status: 400 }
      );
    }

    // Process each place ID in parallel
    const results = await Promise.allSettled(
      validPlaceIds.map(async (placeId) => {
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?` +
            `place_id=${encodeURIComponent(placeId)}` +
            `&fields=place_id,name,formatted_address,geometry,rating,user_ratings_total,` +
            `photos,opening_hours,business_status,price_level,types,url,website,` +
            `formatted_phone_number,international_phone_number,editorial_summary,reviews` +
            `&key=${process.env.GOOGLE_MAPS_API_KEY}`,
            {
              headers: {
                'Accept': 'application/json',
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Google Places API error: ${response.status}`);
          }

          const data = await response.json();

          if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            throw new Error(`Google Places API status: ${data.status}`);
          }

          return {
            placeId,
            success: true,
            data: data.result || null,
            status: data.status
          };
        } catch (error) {
          return {
            placeId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: null
          };
        }
      })
    );

    // Transform results to match expected format
    const processedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          placeId: validPlaceIds[index],
          success: false,
          error: result.reason?.message || 'Promise rejected',
          data: null
        };
      }
    });

    // Add cache headers for better performance
    const response = NextResponse.json(processedResults);
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    
    return response;

  } catch (error) {
    console.error('Google Places batch API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 