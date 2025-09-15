import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const { placeId } = await params;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!placeId || !apiKey) {
    console.error('Missing placeId or API key:', { placeId: !!placeId, apiKey: !!apiKey });
    return NextResponse.json({ error: 'Missing placeId or API key' }, { status: 400 });
  }

  try {
    console.log('🖼️ Fetching photos for placeId:', placeId);
    
    // First get the place details to get photo references
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${apiKey}`;
    const detailsResponse = await fetch(detailsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!detailsResponse.ok) {
      console.error('Google Places API error:', detailsResponse.status, detailsResponse.statusText);
      return NextResponse.json({ 
        error: `Google Places API error: ${detailsResponse.status}`,
        images: [] 
      }, { status: detailsResponse.status });
    }
    
    const detailsData = await detailsResponse.json();

    if (detailsData.error_message) {
      console.error('Google Places API error message:', detailsData.error_message);
      return NextResponse.json({ 
        error: detailsData.error_message,
        images: [] 
      }, { status: 400 });
    }

    if (!detailsData.result?.photos || detailsData.result.photos.length === 0) {
      console.log('No photos found for placeId:', placeId);
      return NextResponse.json({ images: [] });
    }

    console.log(`Found ${detailsData.result.photos.length} photos for placeId:`, placeId);

    // Generate photo URLs for the first 16 photos
    const photoUrls = detailsData.result.photos.slice(0, 16).map((photo: any) => {
      const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${apiKey}`;
      console.log('Generated photo URL:', url);
      return url;
    });

    console.log(`Generated ${photoUrls.length} photo URLs for placeId:`, placeId);
    return NextResponse.json({ images: photoUrls });
  } catch (error) {
    console.error('Error fetching vendor photos for placeId:', placeId, error);
    return NextResponse.json({ 
      error: 'Failed to fetch vendor photos',
      images: [] 
    }, { status: 500 });
  }
} 