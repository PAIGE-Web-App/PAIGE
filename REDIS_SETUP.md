# Redis Setup Guide for Advanced Caching

This guide will help you set up Redis for the advanced caching system in your Paige app.

## Overview

Redis is an in-memory data structure store that provides:
- **⚡ Ultra-fast caching** - Sub-millisecond response times
- **🔄 Multi-level caching** - Memory + Redis layers
- **📊 Cache analytics** - Hit rates and performance metrics
- **🔥 Cache warming** - Pre-load frequently accessed data
- **🏷️ Smart invalidation** - Tag-based cache management

## Setup Options

### Option 1: Local Redis (Development)

#### Install Redis on macOS
```bash
# Using Homebrew
brew install redis

# Start Redis
brew services start redis

# Test connection
redis-cli ping
# Should return: PONG
```

#### Install Redis on Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install Redis
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test connection
redis-cli ping
```

#### Install Redis on Windows
```bash
# Using WSL2 (recommended)
# Follow Ubuntu instructions above

# Or using Docker
docker run -d -p 6379:6379 redis:alpine
```

### Option 2: Cloud Redis (Production)

#### Redis Cloud (Recommended)
1. Go to [Redis Cloud](https://redis.com/try-free/)
2. Create a free account
3. Create a new database
4. Copy the connection string
5. Add to your environment variables

#### Upstash Redis
1. Go to [Upstash](https://upstash.com/)
2. Create a free account
3. Create a new Redis database
4. Copy the connection string
5. Add to your environment variables

#### AWS ElastiCache
1. Go to AWS Console
2. Navigate to ElastiCache
3. Create a Redis cluster
4. Configure security groups
5. Get the endpoint URL

## Environment Configuration

Add the Redis URL to your `.env.local` file:

```bash
# Local Redis
REDIS_URL=redis://localhost:6379

# Redis Cloud
REDIS_URL=redis://username:password@host:port

# Upstash Redis
REDIS_URL=redis://username:password@host:port

# AWS ElastiCache
REDIS_URL=redis://your-cluster-endpoint:6379
```

## Testing the Setup

### 1. Test Redis Connection
```bash
# Test basic connectivity
curl http://localhost:3000/api/cache/status

# Expected response:
{
  "success": true,
  "cache": {
    "stats": { ... },
    "health": { ... }
  }
}
```

### 2. Test Cache Operations
```bash
# Set cache entries
curl -X POST http://localhost:3000/api/cache/status \
  -H "Content-Type: application/json" \
  -d '{
    "action": "set",
    "keys": [
      {
        "key": "test:user:123",
        "value": {"name": "John Doe", "email": "john@example.com"},
        "ttl": 300,
        "tags": ["user"]
      }
    ]
  }'

# Get cache stats
curl "http://localhost:3000/api/cache/status?action=stats"

# Invalidate by tags
curl -X POST http://localhost:3000/api/cache/status \
  -H "Content-Type: application/json" \
  -d '{"action": "invalidate", "tags": ["user"]}'
```

## Cache Configuration

### Default Settings
```typescript
const cacheConfig = {
  defaultTTL: 300,           // 5 minutes
  maxMemorySize: 100 * 1024 * 1024, // 100MB
  enableCompression: true,
  enableAnalytics: true
};
```

### TTL Presets
```typescript
const ttl = {
  short: 60,      // 1 minute
  medium: 300,    // 5 minutes
  long: 1800,     // 30 minutes
  veryLong: 3600, // 1 hour
  day: 86400      // 24 hours
};
```

### Cache Tags
```typescript
const tags = {
  user: 'user',
  vendor: 'vendor',
  contact: 'contact',
  message: 'message',
  email: 'email',
  notification: 'notification'
};
```

## Usage Examples

### Basic Caching
```typescript
import { advancedCache, cacheUtils } from '@/utils/advancedCache';

// Cache user data
await advancedCache.set(
  cacheUtils.key('user', userId),
  userData,
  cacheUtils.ttl.long,
  [cacheUtils.tags.user]
);

// Get cached data
const userData = await advancedCache.get(cacheUtils.key('user', userId));
```

### Cache Integration Utilities
```typescript
import { cacheUserData, getCachedUserData } from '@/utils/cacheIntegration';

// Cache user data
await cacheUserData(userId, userData);

// Get cached user data
const userData = await getCachedUserData(userId);
```

### Cache Decorators
```typescript
import { cachedMethod } from '@/utils/cacheIntegration';

class UserService {
  @cachedMethod('user', 1800, ['user'])
  async getUserById(userId: string) {
    // This method will be automatically cached
    return await fetchUserFromDatabase(userId);
  }
}
```

## Monitoring and Analytics

### Cache Health Dashboard
```bash
# Get comprehensive cache status
curl http://localhost:3000/api/cache/status

# Get cache statistics
curl "http://localhost:3000/api/cache/status?action=stats"

# Get cache health
curl "http://localhost:3000/api/cache/status?action=health"
```

### Performance Metrics
- **Hit Rate**: Percentage of cache hits vs misses
- **Memory Usage**: Current memory consumption
- **Keys Count**: Number of cached items
- **Response Time**: Average cache response time

### Health Alerts
The system automatically monitors:
- Low hit rates (< 50%)
- High memory usage (> 80%)
- Excessive cache misses
- Redis connection issues

## Troubleshooting

### Common Issues

#### 1. Redis Connection Failed
```bash
# Check if Redis is running
redis-cli ping

# Check Redis logs
tail -f /var/log/redis/redis-server.log

# Restart Redis
sudo systemctl restart redis-server
```

#### 2. High Memory Usage
```bash
# Check Redis memory info
redis-cli info memory

# Clear all cache
curl -X POST http://localhost:3000/api/cache/status \
  -H "Content-Type: application/json" \
  -d '{"action": "clear"}'
```

#### 3. Low Hit Rate
- Increase TTL for frequently accessed data
- Add more cache entries
- Review cache key patterns
- Enable cache warming

### Performance Optimization

#### 1. Cache Warming
```bash
# Trigger cache warming
curl -X POST http://localhost:3000/api/cache/status \
  -H "Content-Type: application/json" \
  -d '{"action": "warm"}'
```

#### 2. Memory Optimization
```bash
# Configure Redis memory limits
# Add to redis.conf:
maxmemory 100mb
maxmemory-policy allkeys-lru
```

#### 3. Connection Pooling
```typescript
// Configure Redis connection pool
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryDelayOnFailover: 100
});
```

## Production Considerations

### Security
- Use Redis ACLs for authentication
- Enable SSL/TLS for cloud Redis
- Configure firewall rules
- Use strong passwords

### Scaling
- Use Redis Cluster for high availability
- Implement read replicas
- Monitor memory usage
- Set up automated backups

### Monitoring
- Set up Redis monitoring (RedisInsight, Grafana)
- Configure alerts for memory usage
- Monitor cache hit rates
- Track response times

## Migration from Memory Cache

If you're migrating from the existing memory cache:

1. **Gradual Migration**: The system supports both memory and Redis caching
2. **Data Migration**: Cache data will be automatically migrated
3. **Performance Monitoring**: Compare hit rates and response times
4. **Fallback Support**: System falls back to memory cache if Redis is unavailable

## Support

For issues with Redis setup:
1. Check the troubleshooting section above
2. Review Redis logs
3. Test with redis-cli
4. Check environment variables
5. Verify network connectivity

For issues with the caching system:
1. Check cache status API
2. Review cache statistics
3. Monitor cache health
4. Test cache operations
5. Check application logs 