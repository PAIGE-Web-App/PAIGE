import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiting store
const rateLimitStore: { [key: string]: { count: number; resetTime: number } } = {};

// Rate limiting configuration
const rateLimitConfig = {
  general: { windowMs: 15 * 60 * 1000, max: 100 }, // 15 minutes, 100 requests
  googlePlaces: { windowMs: 60 * 1000, max: 10 }, // 1 minute, 10 requests
  auth: { windowMs: 15 * 60 * 1000, max: 20 }, // 15 minutes, 20 requests
  upload: { windowMs: 60 * 1000, max: 5 } // 1 minute, 5 requests
};

// Get rate limit config for a path
function getRateLimitConfig(pathname: string) {
  if (pathname.includes('/api/auth/')) return rateLimitConfig.auth;
  if (pathname.includes('/api/google-places') || pathname.includes('/api/google-place-details')) return rateLimitConfig.googlePlaces;
  if (pathname.includes('/api/upload') || pathname.includes('/api/vendor-photos')) return rateLimitConfig.upload;
  return rateLimitConfig.general;
}

// Check rate limit
function checkRateLimit(request: NextRequest, pathname: string) {
  const config = getRateLimitConfig(pathname);
  const clientId = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const now = Date.now();
  
  // Clean up expired entries
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime <= now) {
      delete rateLimitStore[key];
    }
  });
  
  const key = `${clientId}:${pathname}`;
  
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + config.windowMs
    };
    return { allowed: true, remaining: config.max - 1, resetTime: rateLimitStore[key].resetTime };
  }
  
  const client = rateLimitStore[key];
  
  if (now > client.resetTime) {
    client.count = 1;
    client.resetTime = now + config.windowMs;
    return { allowed: true, remaining: config.max - 1, resetTime: client.resetTime };
  }
  
  if (client.count >= config.max) {
    return { allowed: false, remaining: 0, resetTime: client.resetTime };
  }
  
  client.count++;
  return { allowed: true, remaining: config.max - client.count, resetTime: client.resetTime };
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Handle API rate limiting
  if (path.startsWith('/api')) {
    const result = checkRateLimit(request, path);
    const config = getRateLimitConfig(path);
    
    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests from this IP',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': config.max.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString()
          }
        }
      );
    }
    
    // Add rate limit headers to successful API requests
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', config.max.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
    
    return response;
  }

  // Allow static files and Next.js internals
  if (
    path.startsWith('/_next') ||
    path.startsWith('/favicon.ico') ||
    path.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // Allow all page routes - let Firebase Admin SDK handle authentication in API routes
  // and let the client-side handle page-level authentication
  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // Only handle API routes for rate limiting
    '/api/:path*',
  ],
} 