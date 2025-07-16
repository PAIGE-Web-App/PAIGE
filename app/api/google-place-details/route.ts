import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get('placeId');
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!placeId || !apiKey) {
    return NextResponse.json({ error: 'Missing placeId or API key' }, { status: 400 });
  }
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,photos,rating,user_ratings_total,price_level,types,website,formatted_phone_number,international_phone_number&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  return NextResponse.json(data);
} 