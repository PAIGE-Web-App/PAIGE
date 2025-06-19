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

  console.log('Middleware:', { path, isPublicPath, hasToken: !!token });

  // If user is on a public path (login/signup), always allow access
  if (isPublicPath) {
    console.log('Middleware: Allowing access to public path');
    return NextResponse.next();
  }

  // If user is not on a public path and has no token, redirect to login
  if (!token) {
    console.log('Middleware: No token, redirecting to login');
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('show-toast', 'Please login to access this page');
    return response;
  }

  // User has token and is accessing protected route - allow access
  console.log('Middleware: Token present, allowing access to protected route');
  return NextResponse.next();
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