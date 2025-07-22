// utils/rateLimit.ts
// Rate limiting utility for Next.js App Router

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string;
  statusCode?: number;
  headers?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      message: 'Too many requests from this IP',
      statusCode: 429,
      headers: true,
      ...config
    };
  }

  // Clean up expired entries
  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    });
  }

  // Get client identifier (IP address or user ID)
  private getClientId(request: Request): string {
    // Try to get IP from various headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (realIp) {
      return realIp;
    }
    if (cfConnectingIp) {
      return cfConnectingIp;
    }
    
    // Fallback to a default identifier
    return 'unknown';
  }

  // Check if request is allowed
  check(request: Request): { allowed: boolean; remaining: number; resetTime: number } {
    this.cleanup();
    
    const clientId = this.getClientId(request);
    const now = Date.now();
    
    if (!this.store[clientId]) {
      this.store[clientId] = {
        count: 1,
        resetTime: now + this.config.windowMs
      };
      return {
        allowed: true,
        remaining: this.config.max - 1,
        resetTime: this.store[clientId].resetTime
      };
    }

    const client = this.store[clientId];
    
    // Reset if window has passed
    if (now > client.resetTime) {
      client.count = 1;
      client.resetTime = now + this.config.windowMs;
      return {
        allowed: true,
        remaining: this.config.max - 1,
        resetTime: client.resetTime
      };
    }

    // Check if limit exceeded
    if (client.count >= this.config.max) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: client.resetTime
      };
    }

    // Increment count
    client.count++;
    
    return {
      allowed: true,
      remaining: this.config.max - client.count,
      resetTime: client.resetTime
    };
  }

  // Create rate limit headers
  createHeaders(remaining: number, resetTime: number): Headers {
    const headers = new Headers();
    
    if (this.config.headers) {
      headers.set('X-RateLimit-Limit', this.config.max.toString());
      headers.set('X-RateLimit-Remaining', remaining.toString());
      headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
    }
    
    return headers;
  }
}

// Pre-configured rate limiters for different endpoints
export const rateLimiters = {
  // General API rate limiter (100 requests per 15 minutes)
  general: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP'
  }),

  // Google Places API rate limiter (more restrictive due to external API limits)
  googlePlaces: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: 'Google Places API rate limit exceeded'
  }),

  // Authentication rate limiter (prevent brute force)
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many authentication attempts'
  }),

  // File upload rate limiter
  upload: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: 'Too many file uploads'
  })
};

// Rate limiting middleware function
export function withRateLimit(
  rateLimiter: RateLimiter,
  handler: (request: Request) => Promise<Response>
) {
  return async (request: Request): Promise<Response> => {
    const result = rateLimiter.check(request);
    
    if (!result.allowed) {
      const headers = rateLimiter.createHeaders(result.remaining, result.resetTime);
      headers.set('Content-Type', 'application/json');
      
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: rateLimiter['config'].message,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers
        }
      );
    }

    // Add rate limit headers to successful responses
    const response = await handler(request);
    const rateLimitHeaders = rateLimiter.createHeaders(result.remaining, result.resetTime);
    
    // Merge headers
    rateLimitHeaders.forEach((value, key) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

// Helper function to get appropriate rate limiter for an endpoint
export function getRateLimiter(pathname: string): RateLimiter {
  if (pathname.includes('/api/auth/')) {
    return rateLimiters.auth;
  }
  if (pathname.includes('/api/google-places') || pathname.includes('/api/google-place-details')) {
    return rateLimiters.googlePlaces;
  }
  if (pathname.includes('/api/upload') || pathname.includes('/api/vendor-photos')) {
    return rateLimiters.upload;
  }
  return rateLimiters.general;
} 