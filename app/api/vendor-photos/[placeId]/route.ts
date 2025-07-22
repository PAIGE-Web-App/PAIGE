import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const { placeId } = await params;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!placeId || !apiKey) {
    return NextResponse.json({ error: 'Missing placeId or API key' }, { status: 400 });
  }

  try {
    // First get the place details to get photo references
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${apiKey}`;
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.error_message) {
      return NextResponse.json({ error: detailsData.error_message }, { status: 400 });
    }

    if (!detailsData.result?.photos || detailsData.result.photos.length === 0) {
      return NextResponse.json({ images: [] });
    }

    // Generate photo URLs for the first 16 photos
    const photoUrls = detailsData.result.photos.slice(0, 16).map((photo: any) => 
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${apiKey}`
    );

    return NextResponse.json({ images: photoUrls });
  } catch (error) {
    console.error('Error fetching vendor photos:', error);
    return NextResponse.json({ error: 'Failed to fetch vendor photos' }, { status: 500 });
  }
} 