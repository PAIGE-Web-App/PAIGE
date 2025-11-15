// app/api/shopify/collections/[handle]/products/route.ts
import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || 'https://remicity.com';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

let shopDomain = SHOPIFY_STORE_URL.replace(/\/$/, '').replace(/^https?:\/\//, '');

if (!shopDomain.includes('myshopify.com')) {
  const shopName = shopDomain.split('.')[0];
  shopDomain = `${shopName}.myshopify.com`;
}

const customDomain = shopDomain.includes('myshopify.com') 
  ? 'https://remicity.com'
  : SHOPIFY_STORE_URL.replace(/\/$/, '');

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

    // First, get the collection to find its ID
    let collectionId: number | null = null;

    // Try smart collections
    let url = `https://${shopDomain}/admin/api/2024-01/smart_collections.json?handle=${handle}`;
    let response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json();
      const collection = data.smart_collections?.[0];
      if (collection) {
        collectionId = collection.id;
      }
    }

    // If not found, try custom collections
    if (!collectionId) {
      url = `https://${shopDomain}/admin/api/2024-01/custom_collections.json?handle=${handle}`;
      response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        const collection = data.custom_collections?.[0];
        if (collection) {
          collectionId = collection.id;
        }
      }
    }

    if (!collectionId) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Fetch products in this collection
    const productsUrl = `https://${shopDomain}/admin/api/2024-01/products.json?collection_id=${collectionId}&limit=250&status=active`;
    const productsResponse = await fetch(productsUrl, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!productsResponse.ok) {
      const errorText = await productsResponse.text();
      console.error('Shopify API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch products from collection', details: errorText },
        { status: productsResponse.status }
      );
    }

    const productsData = await productsResponse.json();
    const products = productsData.products || [];

    // Transform products to match our format
    const transformedProducts = products.map((product: any) => {
      const image = product.images && product.images.length > 0 
        ? product.images[0].src 
        : null;
      
      const variants = product.variants || [];
      const price = variants.length > 0 
        ? parseFloat(variants[0].price) 
        : null;
      
      const compareAtPrice = variants.length > 0 && variants[0].compare_at_price
        ? parseFloat(variants[0].compare_at_price)
        : null;

      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        description: product.body_html,
        image,
        images: product.images?.map((img: any) => img.src) || [],
        price,
        compareAtPrice,
        currency: 'USD',
        variants: variants.map((v: any) => ({
          id: v.id,
          title: v.title,
          price: parseFloat(v.price),
          compareAtPrice: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
          available: v.inventory_quantity > 0 || v.inventory_policy === 'continue',
          inventoryQuantity: v.inventory_quantity,
        })),
        tags: product.tags?.split(',') || [],
        vendor: product.vendor,
        productType: product.product_type,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
        url: `${customDomain}/products/${product.handle}`,
      };
    });

    return NextResponse.json({
      products: transformedProducts,
      count: transformedProducts.length,
    });
  } catch (error: any) {
    console.error('Error fetching collection products:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

