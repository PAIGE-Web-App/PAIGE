# Remicity Shopify Integration Setup

## Overview
The Remicity jewelry store has been integrated into Paige as a separate navigation item (not a vendor). Users can browse products and purchase directly from the Remicity Shopify store.

## Environment Variables Required

Add these to your `.env.local` file (and Vercel environment variables):

```bash
# Shopify Store Configuration
# IMPORTANT: Use your .myshopify.com domain for the Admin API
# Example: https://remicity.myshopify.com (replace 'remicity' with your actual shop name)
SHOPIFY_STORE_URL=https://remicity.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_access_token_here
```

## Important Notes

1. **Shopify Domain**: The Admin API requires the `.myshopify.com` domain, not the custom domain (remicity.com). If you're not sure what your myshopify.com domain is:
   - Log into your Shopify admin
   - Check the URL - it should be something like `remicity.myshopify.com`
   - Use that for `SHOPIFY_STORE_URL`

2. **Product URLs**: Product links will use the custom domain (remicity.com) for the storefront, but the API calls use the myshopify.com domain.

3. **Discount Codes**: Users can enter discount codes in the jewelry store page. These codes are passed as URL parameters when clicking "Buy Now" and will be applied at checkout if valid in Shopify.

## Features Implemented

- ✅ Product listing from Shopify
- ✅ Product search functionality
- ✅ Product images and pricing display
- ✅ Discount code input (applied at checkout)
- ✅ Direct checkout links to Shopify store
- ✅ Responsive product grid
- ✅ Sale badges for discounted items

## Navigation

The "Jewelry Store" item has been added to:
- VerticalNav (desktop sidebar)
- ModernBottomNav (mobile bottom nav)
- TopNav (top navigation bar)

## API Endpoint

- `/api/shopify/products` - Fetches products from Shopify Admin API
  - Query params: `limit`, `collection_id`, `product_id`

## Next Steps (Optional Enhancements)

1. Product detail modal/page
2. Collection filtering
3. Cart integration (if using Shopify Cart API)
4. Product favorites/wishlist
5. Recently viewed products

