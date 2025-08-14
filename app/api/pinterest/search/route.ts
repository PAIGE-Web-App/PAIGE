import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  let query: string | undefined;
  let limit: number;
  
  try {
    const body = await request.json();
    query = body.query;
    limit = body.limit || 12;
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Pinterest API configuration
    const PINTEREST_ACCESS_TOKEN = process.env.PINTEREST_ACCESS_TOKEN;
    const PINTEREST_API_URL = 'https://api.pinterest.com/v5';
    
    if (!PINTEREST_ACCESS_TOKEN) {
      console.warn('Pinterest access token not configured, using fallback');
      return NextResponse.json(
        { error: 'Pinterest integration not configured' },
        { status: 503 }
      );
    }

    // Search Pinterest pins
    const searchResponse = await fetch(
      `${PINTEREST_API_URL}/pins/search?query=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${PINTEREST_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`Pinterest API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    // Transform Pinterest data to our format
    const pins = searchData.items?.map((pin: any) => ({
      id: pin.id,
      title: pin.title || pin.description || 'Wedding Inspiration',
      imageUrl: pin.media?.images?.['1200x']?.url || pin.media?.images?.['600x']?.url || pin.media?.images?.['originals']?.url,
      source: 'Pinterest',
      description: pin.description,
      link: pin.link,
      board: pin.board?.name,
      creator: pin.creator?.username
    })) || [];

    // Filter out pins without images
    const validPins = pins.filter((pin: any) => pin.imageUrl);

    return NextResponse.json({
      pins: validPins,
      total: validPins.length,
      query: query
    });

  } catch (error) {
    console.error('Pinterest search error:', error);
    
    // Return fallback data for development/testing
    if (process.env.NODE_ENV === 'development') {
      const fallbackPins = [
        {
          id: 'fallback-1',
          title: 'Romantic Garden Wedding',
          imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=500&fit=crop',
          source: 'Pinterest',
          description: 'Beautiful garden wedding inspiration',
          link: '#',
          board: 'Wedding Dreams',
          creator: 'wedding_planner'
        },
        {
          id: 'fallback-2',
          title: 'Modern Minimalist Ceremony',
          imageUrl: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&h=500&fit=crop',
          source: 'Pinterest',
          description: 'Clean and modern wedding aesthetic',
          link: '#',
          board: 'Minimalist Weddings',
          creator: 'style_guide'
        },
        {
          id: 'fallback-3',
          title: 'Boho Beach Wedding',
          imageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=500&fit=crop',
          source: 'Pinterest',
          description: 'Relaxed beach wedding vibes',
          link: '#',
          board: 'Beach Weddings',
          creator: 'ocean_lover'
        },
        {
          id: 'fallback-4',
          title: 'Vintage Romance',
          imageUrl: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&h=500&fit=crop',
          source: 'Pinterest',
          description: 'Timeless vintage wedding inspiration',
          link: '#',
          board: 'Vintage Weddings',
          creator: 'vintage_curator'
        },
        {
          id: 'fallback-5',
          title: 'Luxury Glamour',
          imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=500&fit=crop',
          source: 'Pinterest',
          description: 'Elegant and luxurious wedding style',
          link: '#',
          board: 'Luxury Weddings',
          creator: 'luxury_events'
        },
        {
          id: 'fallback-6',
          title: 'Rustic Charm',
          imageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=500&fit=crop',
          source: 'Pinterest',
          description: 'Cozy rustic wedding aesthetic',
          link: '#',
          board: 'Rustic Weddings',
          creator: 'rustic_romance'
        }
      ];

      return NextResponse.json({
        pins: fallbackPins,
        total: fallbackPins.length,
        query: query || 'unknown',
        note: 'Using fallback images (Pinterest API not configured)'
      });
    }

    return NextResponse.json(
      { error: 'Failed to search Pinterest' },
      { status: 500 }
    );
  }
}
