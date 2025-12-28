/**
 * Middleware for Next.js 15 App Router
 * Handles authentication and route protection
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth';

/**
 * Middleware function for Next.js
 * Protects admin routes and handles authentication
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/admin/auth/login',
    '/admin/auth/register',
    '/api/auth/login',
    '/api/auth/register',
  ];

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check for admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      // Redirect to login for page routes
      if (!pathname.startsWith('/api')) {
        const loginUrl = new URL('/admin/auth/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Return 401 for API routes
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // For API routes, let the route handler handle validation
    // For page routes, we'll validate on the server component
    return NextResponse.next();
  }

  // OAuth callback routes
  if (pathname.startsWith('/login') || pathname.startsWith('/callback')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

/**
 * Configuration for middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (uploads, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
