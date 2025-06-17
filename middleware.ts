import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Allow static files and Next.js internals
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.startsWith('/favicon.ico') ||
    path.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // Define public paths that don't require authentication
  const isPublicPath = path === '/login' || path === '/signup';

  // Get the Firebase auth token from the cookies
  const token = request.cookies.get('__session')?.value || '';

  // Redirect logic
  if (isPublicPath && token) {
    // If user is logged in and tries to access login/signup, allow /signup for onboarding
    if (path === '/signup') {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!isPublicPath && !token) {
    // If user is not logged in and tries to access protected route, redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    // Add a query parameter to show the toast message
    response.cookies.set('show-toast', 'Please login to access this page');
    return response;
  }
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 