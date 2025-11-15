// app/api/shopify/products/[handle]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || 'https://remicity.com';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

// Extract shop domain
let shopDomain = SHOPIFY_STORE_URL.replace(/\/$/, '').replace(/^https?:\/\//, '');
if (!shopDomain.includes('myshopify.com')) {
  const shopName = shopDomain.split('.')[0];
  shopDomain = `${shopName}.myshopify.com`;
}

const adminApiUrl = `https://${shopDomain}/admin/api/2024-01/products.json`;

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

    // Fetch all products and find by handle with caching (5 minutes)
    const response = await fetch(`${adminApiUrl}?limit=250&status=active`, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch product from Shopify', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const product = data.products?.find((p: any) => p.handle === handle);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Transform product
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

    const customDomain = shopDomain.includes('myshopify.com') 
      ? 'https://remicity.com'
      : SHOPIFY_STORE_URL.replace(/\/$/, '');

    const transformedProduct = {
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

    return NextResponse.json({ product: transformedProduct });
  } catch (error) {
    console.error('Error fetching Shopify product:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

