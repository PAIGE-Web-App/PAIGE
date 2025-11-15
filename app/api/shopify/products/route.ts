// app/api/shopify/products/route.ts
import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || 'https://remicity.com';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

// Shopify Admin API requires the .myshopify.com domain
// If SHOPIFY_STORE_URL is a custom domain (like remicity.com), you need to provide the myshopify.com domain
// Format: https://{shop-name}.myshopify.com
// For now, we'll try to use the provided URL, but it should be the myshopify.com domain
let shopDomain = SHOPIFY_STORE_URL.replace(/\/$/, '').replace(/^https?:\/\//, '');

// If it's not a myshopify.com domain, we'll try to construct it
// NOTE: You may need to set SHOPIFY_STORE_URL to your actual myshopify.com domain
// Example: https://remicity.myshopify.com (replace 'remicity' with your actual shop name)
if (!shopDomain.includes('myshopify.com')) {
  // Try to extract shop name from custom domain (this is a fallback - you should set the myshopify.com URL)
  const shopName = shopDomain.split('.')[0];
  shopDomain = `${shopName}.myshopify.com`;
}

const adminApiUrl = `https://${shopDomain}/admin/api/2024-01/products.json`;

export async function GET(req: NextRequest) {
  try {
    if (!SHOPIFY_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Shopify access token not configured' },
        { status: 500 }
      );
    }

    // Get query parameters for filtering
    const searchParams = req.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '50';
    const collectionId = searchParams.get('collection_id');
    const productId = searchParams.get('product_id');

    let url = `${adminApiUrl}?limit=${limit}&status=active`;

    // Add collection filter if provided
    if (collectionId) {
      url += `&collection_id=${collectionId}`;
    }

    // Fetch products from Shopify
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch products from Shopify', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    let products = data.products || [];

    // Filter by product ID if provided
    if (productId) {
      products = products.filter((p: any) => p.id.toString() === productId);
    }

    // Determine custom domain for product URLs
    // If SHOPIFY_STORE_URL is myshopify.com, use remicity.com for storefront links
    const customDomain = shopDomain.includes('myshopify.com') 
      ? 'https://remicity.com'
      : SHOPIFY_STORE_URL.replace(/\/$/, '');

    // Transform products to include images and variants
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
  } catch (error) {
    console.error('Error fetching Shopify products:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

