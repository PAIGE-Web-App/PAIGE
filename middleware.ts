import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiting store
const rateLimitStore: { [key: string]: { count: number; resetTime: number } } = {};

// Rate limiting configuration
const rateLimitConfig = {
  general: { windowMs: 15 * 60 * 1000, max: 100 }, // 15 minutes, 100 requests
  googlePlaces: { windowMs: 60 * 1000, max: 10 }, // 1 minute, 10 requests
  auth: { windowMs: 15 * 60 * 1000, max: 20 }, // 15 minutes, 20 requests (increased for testing)
  upload: { windowMs: 60 * 1000, max: 5 } // 1 minute, 5 requests
};

// Authentication loop prevention
const authLoopPrevention: { [key: string]: { attempts: number; lastAttempt: number; blocked: boolean } } = {};

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

// Check for authentication loops
function checkAuthLoop(request: NextRequest): boolean {
  const clientId = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const now = Date.now();
  const key = `auth_loop:${clientId}`;
  
  // Clean up old entries
  Object.keys(authLoopPrevention).forEach(k => {
    if (now - authLoopPrevention[k].lastAttempt > 5 * 60 * 1000) { // 5 minutes
      delete authLoopPrevention[k];
    }
  });
  
  if (!authLoopPrevention[key]) {
    authLoopPrevention[key] = { attempts: 1, lastAttempt: now, blocked: false };
    return false;
  }
  
  const client = authLoopPrevention[key];
  
  // If blocked, check if enough time has passed
  if (client.blocked) {
    if (now - client.lastAttempt > 30 * 1000) { // 30 seconds (reduced from 2 minutes)
      client.blocked = false;
      client.attempts = 1;
      client.lastAttempt = now;
      return false;
    }
    return true; // Still blocked
  }
  
  // Check for rapid auth attempts - be much more lenient
  if (now - client.lastAttempt < 200) { // Less than 0.2 seconds between attempts
    client.attempts++;
    if (client.attempts >= 20) { // 20 rapid attempts (increased from 10)
      client.blocked = true;
      return true;
    }
  } else {
    client.attempts = 1;
  }
  
  client.lastAttempt = now;
  return false;
}

// Clear rate limiting for a client (called on successful authentication)
export function clearRateLimit(clientId: string) {
  const key = `auth_loop:${clientId}`;
  if (authLoopPrevention[key]) {
    delete authLoopPrevention[key];
  }
}

// Enhanced authentication validation
async function validateAuthToken(token: string): Promise<boolean> {
  try {
    // Make a request to validate the token
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
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

      // Define public paths that don't require authentication
      const isPublicPath = path === '/login' || path === '/signup' || path === '/rate-limit' || path === '/test-edge-config' || path === '/test-migration' || path === '/test-credit-config' || path === '/test-ui-text' || path === '/test-session-cookie';
  const isApiPath = path.startsWith('/api/');
  
  // Allow Next.js internal routes and static files
  if (path.startsWith('/_next') || path.startsWith('/favicon.ico') || path.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?|ttf|eot)$/)) {
    return NextResponse.next();
  }

  // Skip authentication loop detection for API routes and public paths
  if (!isApiPath && !isPublicPath) {
    // Check for authentication loops before proceeding
    if (checkAuthLoop(request)) {
      const rateLimitUrl = new URL('/rate-limit?retryAfter=30', request.url);
      return NextResponse.redirect(rateLimitUrl);
    }
  }

  // Get the Firebase auth token from the cookies
  // Use only the HttpOnly server cookie for security
  const token = request.cookies.get('__session')?.value || '';

  // Debug logging for messages page
  if (path === '/messages') {
    console.log('🔍 Messages page access:', {
      path,
      hasToken: !!token,
      tokenLength: token.length,
      cookies: request.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
    });
  }

  // If user is on a public path (login/signup), always allow access
  if (isPublicPath) {
    return NextResponse.next();
  }

  // If user is not on a public path and has no token, redirect to login
  if (!token) {
    console.log('🚫 No token found for protected route:', path);
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('show-toast', 'Please login to access this page');
    return response;
  }

  // Enhanced token validation for protected routes
  // Check if token exists and has reasonable length (basic validation)
  if (token.length < 10) {
    console.log('🚫 Invalid token format for protected route:', path);
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('show-toast', 'Session expired, please login again');
    return response;
  }
  
  // User has valid token and is accessing protected route - allow access
  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 