import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const { placeId } = await params;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  // OPTIMIZATION: Allow limiting number of photos via query param
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '6', 10); // Default to 6 instead of 16
  const maxPhotos = Math.min(Math.max(limit, 1), 16); // Between 1-16
  
  if (!placeId || !apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Missing placeId or API key:', { placeId: !!placeId, apiKey: !!apiKey });
    }
    return NextResponse.json({ error: 'Missing placeId or API key' }, { status: 400 });
  }

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('🖼️ Fetching photos for placeId:', placeId, 'limit:', maxPhotos);
    }
    
    // First get the place details to get photo references
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${apiKey}`;
    const detailsResponse = await fetch(detailsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!detailsResponse.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Google Places API error:', detailsResponse.status, detailsResponse.statusText);
      }
      return NextResponse.json({ 
        error: `Google Places API error: ${detailsResponse.status}`,
        images: [] 
      }, { status: detailsResponse.status });
    }
    
    const detailsData = await detailsResponse.json();

    if (detailsData.error_message) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Google Places API error message:', detailsData.error_message);
      }
      return NextResponse.json({ 
        error: detailsData.error_message,
        images: [] 
      }, { status: 400 });
    }

    if (!detailsData.result?.photos || detailsData.result.photos.length === 0) {
      return NextResponse.json({ images: [] });
    }

    // OPTIMIZATION: Return only requested number of photos (default 6, max 16)
    const photoUrls = detailsData.result.photos.slice(0, maxPhotos).map((photo: any) => {
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${apiKey}`;
    });

    return NextResponse.json({ 
      images: photoUrls,
      totalAvailable: detailsData.result.photos.length 
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching vendor photos for placeId:', placeId, error);
    }
    return NextResponse.json({ 
      error: 'Failed to fetch vendor photos',
      images: [] 
    }, { status: 500 });
  }
} 