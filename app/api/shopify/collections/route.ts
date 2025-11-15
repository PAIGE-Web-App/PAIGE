// app/api/shopify/collections/route.ts
import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || 'https://remicity.com';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

let shopDomain = SHOPIFY_STORE_URL.replace(/\/$/, '').replace(/^https?:\/\//, '');

if (!shopDomain.includes('myshopify.com')) {
  const shopName = shopDomain.split('.')[0];
  shopDomain = `${shopName}.myshopify.com`;
}

const adminApiUrl = `https://${shopDomain}/admin/api/2024-01/smart_collections.json`;

export async function GET(req: NextRequest) {
  try {
    if (!SHOPIFY_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Shopify access token not configured' },
        { status: 500 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '50';

    // Fetch smart collections (no status filter - we'll filter by published_at)
    const url = `${adminApiUrl}?limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 900 }, // Cache for 15 minutes (collections change less frequently)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch collections from Shopify', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const allSmartCollections = data.smart_collections || [];
    
    // Filter to only published collections
    const collections = allSmartCollections.filter((collection: any) => {
      const isPublished = collection.published_at !== null && collection.published_at !== undefined;
      const isPublishedToWeb = collection.published_scope === 'web' || collection.published_scope === 'global';
      return isPublished && isPublishedToWeb;
    });

    // Also fetch custom collections
    const customCollectionsUrl = `https://${shopDomain}/admin/api/2024-01/custom_collections.json?limit=${limit}`;
    const customResponse = await fetch(customCollectionsUrl, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 900 }, // Cache for 15 minutes
    });

    let customCollections: any[] = [];
    if (customResponse.ok) {
      const customData = await customResponse.json();
      const allCustomCollections = customData.custom_collections || [];
      
      // Filter to only published custom collections
      customCollections = allCustomCollections.filter((collection: any) => {
        const isPublished = collection.published_at !== null && collection.published_at !== undefined;
        const isPublishedToWeb = collection.published_scope === 'web' || collection.published_scope === 'global';
        return isPublished && isPublishedToWeb;
      });
    }

    // Combine and transform collections
    let allCollections = [...collections, ...customCollections].map((collection: any) => ({
      id: collection.id,
      title: collection.title,
      handle: collection.handle,
      description: collection.body_html || collection.description || '',
      image: collection.image?.src || null,
      publishedAt: collection.published_at,
      updatedAt: collection.updated_at,
      sortOrder: collection.sort_order || 'manual',
      productsCount: collection.products_count || 0, // Include product count
    }));

    // Based on remicity.com/collections, only show the 8 main collections displayed there
    // Using actual handles from Shopify API response
    const mainCollectionHandles = [
      'all-the-3s', // "All The Hearts"
      'cartilage-earrings',
      'two-tone-jewelry',
      'dreams-of-italy',
      'letter-necklaces',
      'pave-jewelry', // "Pavé Jewelry"
      'stud-earrings',
      'the-pearl-edit-1', // "The Pearl Edit"
    ];

    // Filter to only show main collections
    allCollections = allCollections.filter((collection) => {
      const handle = collection.handle.toLowerCase();
      return mainCollectionHandles.includes(handle);
    });

    return NextResponse.json({
      collections: allCollections,
      count: allCollections.length,
    });
  } catch (error) {
    console.error('Error fetching Shopify collections:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

