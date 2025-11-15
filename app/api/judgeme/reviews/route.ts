// app/api/judgeme/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Judge.me API endpoint
// Format: https://judge.me/api/v1/reviews?shop={shop-name}.myshopify.com&product_id={product_id}
const JUDGE_ME_API_URL = 'https://judge.me/api/v1/reviews';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('product_id');
    const shopDomain = searchParams.get('shop');

    if (!productId || !shopDomain) {
      return NextResponse.json(
        { error: 'Missing required parameters: product_id and shop' },
        { status: 400 }
      );
    }

    // Get API tokens from environment
    const judgeMePrivateToken = process.env.JUDGE_ME_PRIVATE_TOKEN;
    const judgeMePublicToken = process.env.JUDGE_ME_PUBLIC_TOKEN;
    const judgeMeToken = judgeMePrivateToken || judgeMePublicToken || process.env.JUDGE_ME_API_TOKEN;
    
    // Debug: Check if tokens are loaded (don't log actual token values)
    if (!judgeMeToken) {
      console.warn('[Judge.me API] No API token found in environment variables');
    } else {
      console.log('[Judge.me API] API token found (length:', judgeMeToken.length, 'chars)');
    }
    
    // Try different shop domain formats
    // Judge.me API might expect just the shop name or the full domain
    const shopName = shopDomain.replace('.myshopify.com', '');
    const shopDomainsToTry = [
      shopDomain, // remicity.myshopify.com
      shopName,   // remicity
    ];

    // Build headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    let response: Response | null = null;
    let lastError: string = '';

    // Try each shop domain format
    for (const shop of shopDomainsToTry) {
      let url = `${JUDGE_ME_API_URL}?shop=${shop}&product_id=${productId}&per_page=50`;
      
      // If we have a token, try authenticated requests first
      if (judgeMeToken) {
        // Try with token as query parameter
        const urlWithToken = `${url}&api_token=${judgeMeToken}`;
        response = await fetch(urlWithToken, {
          headers,
          next: { revalidate: 300 }
        });
        
        if (response.ok) {
          return await handleResponse(response, productId, shop);
        }
        
        // Try with Authorization header
        if (response.status === 401) {
          const headersWithAuth = {
            ...headers,
            'Authorization': `Bearer ${judgeMeToken}`
          };
          
          response = await fetch(url, {
            headers: headersWithAuth,
            next: { revalidate: 300 }
          });
          
          if (response.ok) {
            return await handleResponse(response, productId, shop);
          }
        }
      }
      
      // Try public endpoint (no auth)
      response = await fetch(url, {
        headers,
        next: { revalidate: 300 }
      });
      
      if (response.ok) {
        return await handleResponse(response, productId, shop);
      }
      
      // If 404, that's fine (no reviews), but continue trying other formats
      if (response.status === 404) {
        continue;
      }
      
      // Store error for logging
      if (response.status === 401) {
        lastError = `Authentication failed for shop: ${shop}`;
      }
    }
    
    // If we get here, all attempts failed
    // Return empty reviews for 401/404, error for others
    if (response) {
      if (response.status === 401 || response.status === 404) {
        return NextResponse.json({ reviews: [], averageRating: 0, totalReviews: 0 });
      }
    }
    
    return await handleResponse(response || new Response(null, { status: 500 }), productId, shopDomain);
  } catch (error: any) {
    console.error('Error fetching Judge.me reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

async function handleResponse(response: Response, productId: string, shopDomain: string) {
  try {
    if (!response.ok) {
      // If product has no reviews, Judge.me returns 404 or empty array
      if (response.status === 404) {
        return NextResponse.json({ reviews: [], averageRating: 0, totalReviews: 0 });
      }
      
      // For 401 errors, return empty reviews instead of error (authentication issue)
      if (response.status === 401) {
        return NextResponse.json({ reviews: [], averageRating: 0, totalReviews: 0 });
      }
      
      const errorText = await response.text();
      console.error(`[Judge.me API] Error ${response.status} for product ${productId}`);
      
      return NextResponse.json(
        { error: `Failed to fetch reviews from Judge.me: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Judge.me API might return reviews in different formats
    // Check for common response structures
    let reviewsArray = [];
    
    // Try different possible response structures
    if (Array.isArray(data)) {
      reviewsArray = data;
    } else if (data.reviews && Array.isArray(data.reviews)) {
      reviewsArray = data.reviews;
    } else if (data.data && Array.isArray(data.data)) {
      reviewsArray = data.data;
    } else if (data.product && data.product.reviews && Array.isArray(data.product.reviews)) {
      reviewsArray = data.product.reviews;
    }

    // Transform Judge.me review format to our format
    const reviews = reviewsArray.map((review: any) => ({
      id: review.id?.toString() || Math.random().toString(),
      author: review.reviewer?.name || review.name || 'Anonymous',
      rating: review.rating || 0,
      title: review.title || '',
      body: review.body || review.review || '',
      date: review.created_at || review.date || new Date().toISOString(),
      verified: review.verified_buyer || review.verified || false,
      helpful: review.helpful || 0,
    }));

    // Calculate average rating
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
      : 0;

    return NextResponse.json({
      reviews,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews: reviews.length,
    });
  } catch (error: any) {
    console.error('Error processing Judge.me response:', error);
    return NextResponse.json(
      { error: 'Error processing reviews response', details: error.message },
      { status: 500 }
    );
  }
}
