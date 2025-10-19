# Performance Optimization Guide

## Overview
This document outlines the comprehensive caching and performance optimization strategy implemented for the Paige app.

## 🚀 Implemented Optimizations

### 1. **Next.js Configuration Optimizations**

#### Cache Headers Strategy
- **Static Assets**: `max-age=31536000, immutable` (1 year)
- **Images**: `max-age=86400, stale-while-revalidate=604800` (1 day + 1 week revalidation)
- **API Routes**: `max-age=300, stale-while-revalidate=600` (5 min + 10 min revalidation)
- **Vendor Pages**: `max-age=1800, stale-while-revalidate=3600` (30 min + 1 hour revalidation)
- **Other Pages**: `max-age=60, stale-while-revalidate=300` (1 min + 5 min revalidation)

#### Bundle Optimization
- **Code Splitting**: Automatic vendor chunk splitting
- **Firebase Bundle**: Separate chunk for Firebase dependencies
- **Package Optimization**: Optimized imports for `lucide-react` and `framer-motion`

#### Image Optimization
- **WebP/AVIF Support**: Modern image formats
- **Responsive Images**: Multiple device sizes
- **Domain Whitelist**: Google services domains

### 2. **Multi-Layer Caching System**

#### Memory Cache (Fastest)
- **TTL-based**: Automatic expiration
- **Size Limits**: Prevents memory leaks
- **LRU-like**: Automatic cleanup of expired entries

#### LocalStorage Cache (Persistent)
- **TTL Support**: Automatic expiration
- **Error Handling**: Graceful fallback
- **Size Management**: Paige-specific cleanup

#### API Response Cache
- **Smart Keys**: Parameter-based cache keys
- **Dual Storage**: Memory + localStorage
- **Configurable TTL**: Per-endpoint customization

### 3. **SWR Integration**

#### Optimized Configuration
```typescript
{
  revalidateOnFocus: false,        // Prevent unnecessary refetches
  revalidateOnReconnect: true,     // Refresh on network reconnect
  dedupingInterval: 2000,          // Prevent duplicate requests
  focusThrottleInterval: 5000,     // Throttle focus events
  errorRetryCount: 3,              // Retry failed requests
  errorRetryInterval: 5000,        // Retry interval
}
```

#### Custom Hooks
- `useApiFetch`: Generic API caching
- `useVendorDetails`: Vendor-specific caching
- `useGmailEligibility`: Gmail status caching
- `useVendorSearch`: Debounced search with caching
- `useVendorCatalog`: Paginated vendor lists

### 4. **Performance Monitoring**

#### Metrics Tracked
- API call count and duration
- Cache hit/miss rates
- Page load times
- Error rates
- Resource loading performance

#### Real-time Monitoring
- Navigation timing
- Resource loading
- Slow resource detection (>1s)
- Automatic cleanup

## 📊 Cache Configuration

### TTL (Time To Live) Settings
```typescript
{
  userProfile: 5 * 60 * 1000,      // 5 minutes
  vendorDetails: 30 * 60 * 1000,   // 30 minutes
  apiResponses: 10 * 60 * 1000,    // 10 minutes
  gmailEligibility: 60 * 60 * 1000, // 1 hour
  vendorFavorites: 24 * 60 * 60 * 1000, // 24 hours
}
```

### Memory Cache Limits
```typescript
{
  maxVendorDetails: 50,
  maxApiResponses: 100,
  maxGmailEligibility: 20,
}
```

## 🔧 Usage Examples

### Basic API Caching
```typescript
import { useApiFetch } from '../hooks/useOptimizedFetch';

function MyComponent() {
  const { data, error, isLoading } = useApiFetch('/api/my-endpoint', {
    param1: 'value1',
    param2: 'value2'
  });
  
  // Data is automatically cached and reused
}
```

### Vendor Details Caching
```typescript
import { useVendorDetails } from '../hooks/useOptimizedFetch';

function VendorCard({ placeId }) {
  const { vendorDetails, isLoading } = useVendorDetails(placeId);
  
  // Vendor details cached for 30 minutes
}
```

### Performance Monitoring
```typescript
import { performanceUtils } from '../utils/performance';

// Monitor API calls
const result = await performanceUtils.monitorApiCall('/api/endpoint', async () => {
  return await fetch('/api/endpoint');
});

// Get performance report
const report = performanceUtils.getReport();
console.log('Cache hit rate:', report.cacheHitRate);
```

## 🎯 Performance Benefits

### Expected Improvements
1. **Page Load Speed**: 40-60% faster initial loads
2. **API Response Time**: 70-90% faster for cached data
3. **Bandwidth Usage**: 50-80% reduction in API calls
4. **User Experience**: Smoother navigation and interactions
5. **Server Load**: Reduced backend pressure

### Cache Hit Rate Targets
- **Vendor Details**: 80-90% (frequently accessed)
- **API Responses**: 60-80% (moderate reuse)
- **Gmail Eligibility**: 70-85% (user-specific)

## 🛠️ Maintenance

### Automatic Cleanup
- **Memory Cache**: Every 5 minutes
- **Expired Entries**: Automatic removal
- **Size Limits**: Prevents memory leaks

### Manual Cache Management
```typescript
import { cacheUtils } from '../lib/cache';

// Clear all caches
cacheUtils.clearAll();

// Get cache statistics
const stats = cacheUtils.getStats();
console.log('Cache sizes:', stats);
```

### Performance Monitoring
```typescript
import { performanceUtils } from '../utils/performance';

// Reset metrics
performanceUtils.reset();

// Get detailed report
const report = performanceUtils.getReport();
```

## 🔍 Debugging

### Development Mode
- Cache hits/misses logged to console
- API call timing displayed
- Performance metrics visible
- Slow resource warnings

### Production Monitoring
- Error tracking
- Performance metrics collection
- Cache effectiveness monitoring

## 📈 Future Optimizations

### Planned Improvements
1. **Service Worker**: Offline caching
2. **CDN Integration**: Global content delivery
3. **Database Query Optimization**: Firestore query caching
4. **Image Lazy Loading**: Intersection Observer integration
5. **Bundle Analysis**: Webpack bundle analyzer

### Monitoring Enhancements
1. **Real-time Dashboard**: Performance metrics UI
2. **Alert System**: Performance degradation alerts
3. **A/B Testing**: Cache strategy comparison
4. **User Analytics**: Performance impact on user behavior

## 🚨 Important Notes

### Cache Invalidation
- Manual cache clearing available
- TTL-based automatic expiration
- SWR revalidation on network changes

### Memory Management
- Automatic cleanup prevents memory leaks
- Size limits enforced on all caches
- Graceful degradation on storage errors

### Error Handling
- Cache failures don't break functionality
- Fallback to fresh API calls
- Error logging and monitoring

This optimization strategy provides a robust, scalable caching solution that significantly improves app performance while maintaining data freshness and user experience. 