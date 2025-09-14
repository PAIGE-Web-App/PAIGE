/**
 * Service Worker for Vendor Pages Optimization
 * Caches vendor data, images, and API responses for offline use
 */

const CACHE_NAME = 'paige-vendor-cache-v1';
const VENDOR_DATA_CACHE = 'vendor-data-v1';
const IMAGE_CACHE = 'vendor-images-v1';
const API_CACHE = 'vendor-api-v1';

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache vendor data for 1 hour
  vendorData: { maxAge: 60 * 60 * 1000, strategy: 'cache-first' },
  // Cache images for 24 hours
  images: { maxAge: 24 * 60 * 60 * 1000, strategy: 'cache-first' },
  // Cache API responses for 5 minutes
  api: { maxAge: 5 * 60 * 1000, strategy: 'network-first' }
};

// Install event - set up caches
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME),
      caches.open(VENDOR_DATA_CACHE),
      caches.open(IMAGE_CACHE),
      caches.open(API_CACHE)
    ]).then(() => {
      console.log('Service Worker caches created');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== VENDOR_DATA_CACHE && 
              cacheName !== IMAGE_CACHE && 
              cacheName !== API_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - handle caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (isVendorDataRequest(url)) {
    event.respondWith(handleVendorDataRequest(request));
  } else if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  }
});

// Check if request is for vendor data
function isVendorDataRequest(url) {
  return url.pathname.includes('/vendors/') && 
         !url.pathname.includes('/api/') &&
         !url.pathname.includes('.') &&
         url.pathname !== '/vendors';
}

// Check if request is for images
function isImageRequest(url) {
  return url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
         url.hostname.includes('maps.googleapis.com') ||
         url.hostname.includes('googleusercontent.com');
}

// Check if request is for API
function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') ||
         url.hostname.includes('maps.googleapis.com');
}

// Check if request is for static assets
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|woff|woff2|ttf|eot)$/i);
}

// Handle vendor data requests with cache-first strategy
async function handleVendorDataRequest(request) {
  const cache = await caches.open(VENDOR_DATA_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Check if cache is still valid
    const cacheTime = cachedResponse.headers.get('sw-cache-time');
    if (cacheTime && Date.now() - parseInt(cacheTime) < CACHE_STRATEGIES.vendorData.maxAge) {
      return cachedResponse;
    }
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Clone response and add cache timestamp
      const responseToCache = networkResponse.clone();
      responseToCache.headers.set('sw-cache-time', Date.now().toString());
      cache.put(request, responseToCache);
    }
    return networkResponse;
  } catch (error) {
    // Return cached response if network fails
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return placeholder image if network fails
    return new Response('', {
      status: 404,
      statusText: 'Image not available offline'
    });
  }
}

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Clone response and add cache timestamp
      const responseToCache = networkResponse.clone();
      responseToCache.headers.set('sw-cache-time', Date.now().toString());
      cache.put(request, responseToCache);
    }
    return networkResponse;
  } catch (error) {
    // Fall back to cache if network fails
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const cacheTime = cachedResponse.headers.get('sw-cache-time');
      if (cacheTime && Date.now() - parseInt(cacheTime) < CACHE_STRATEGIES.api.maxAge) {
        return cachedResponse;
      }
    }
    throw error;
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'vendor-favorites-sync') {
    event.waitUntil(syncVendorFavorites());
  }
});

// Sync vendor favorites when back online
async function syncVendorFavorites() {
  try {
    // Get pending favorites from IndexedDB
    const pendingFavorites = await getPendingFavorites();
    
    for (const favorite of pendingFavorites) {
      try {
        await fetch('/api/user-favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(favorite)
        });
        
        // Remove from pending list
        await removePendingFavorite(favorite.id);
      } catch (error) {
        console.error('Failed to sync favorite:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper functions for IndexedDB operations
async function getPendingFavorites() {
  // Implementation would use IndexedDB to get pending favorites
  return [];
}

async function removePendingFavorite(id) {
  // Implementation would use IndexedDB to remove pending favorite
  return;
}

// Message handling for cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  } else if (event.data && event.data.type === 'CACHE_VENDOR_DATA') {
    event.waitUntil(cacheVendorData(event.data.vendorData));
  }
});

// Clear all caches
async function clearAllCaches() {
  const cacheNames = [CACHE_NAME, VENDOR_DATA_CACHE, IMAGE_CACHE, API_CACHE];
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// Cache vendor data proactively
async function cacheVendorData(vendorData) {
  const cache = await caches.open(VENDOR_DATA_CACHE);
  const url = `/vendors/${vendorData.id}`;
  const response = new Response(JSON.stringify(vendorData), {
    headers: {
      'Content-Type': 'application/json',
      'sw-cache-time': Date.now().toString()
    }
  });
  await cache.put(url, response);
}
