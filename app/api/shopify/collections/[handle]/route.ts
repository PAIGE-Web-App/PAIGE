// app/api/shopify/collections/[handle]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || 'https://remicity.com';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

let shopDomain = SHOPIFY_STORE_URL.replace(/\/$/, '').replace(/^https?:\/\//, '');

if (!shopDomain.includes('myshopify.com')) {
  const shopName = shopDomain.split('.')[0];
  shopDomain = `${shopName}.myshopify.com`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    if (!SHOPIFY_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Shopify access token not configured' },
        { status: 500 }
      );
    }

    const { handle } = await params;

    // Try smart collections first with caching (15 minutes)
    let url = `https://${shopDomain}/admin/api/2024-01/smart_collections.json?handle=${handle}`;
    let response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 900 }, // Cache for 15 minutes
    });

    let collection = null;

    if (response.ok) {
      const data = await response.json();
      collection = data.smart_collections?.[0];
    }

    // If not found in smart collections, try custom collections with caching
    if (!collection) {
      url = `https://${shopDomain}/admin/api/2024-01/custom_collections.json?handle=${handle}`;
      response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 900 }, // Cache for 15 minutes
      });

      if (response.ok) {
        const data = await response.json();
        collection = data.custom_collections?.[0];
      }
    }

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const transformedCollection = {
      id: collection.id,
      title: collection.title,
      handle: collection.handle,
      description: collection.body_html || collection.description || '',
      image: collection.image?.src || null,
      publishedAt: collection.published_at,
      updatedAt: collection.updated_at,
      sortOrder: collection.sort_order || 'manual',
    };

    return NextResponse.json({ collection: transformedCollection });
  } catch (error: any) {
    console.error('Error fetching Shopify collection by handle:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

