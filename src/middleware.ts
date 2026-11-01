import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isStaging =
    process.env.STAGING === 'true' ||
    process.env.NEXT_PUBLIC_IS_STAGING === 'true' ||
    (process.env.NODE_ENV as string) === 'staging';

  const response = NextResponse.next();

  // 1. Universal Staging Protection: Never allow staging deployments to be indexed
  if (isStaging) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return response;
  }

  // 2. Private Route Protection: Ensure search crawlers do not index private workspaces or auth
  const isPrivateRoute =
    pathname.startsWith('/owner-report') ||
    pathname.startsWith('/expert-audit') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/');

  if (isPrivateRoute) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  // 3. API Security & Cache-Control: Sensitive report and auth responses must never be cached
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/health')) {
    response.headers.set(
      'Cache-Control',
      'private, no-cache, no-store, max-age=0, must-revalidate'
    );
    response.headers.set('Pragma', 'no-cache');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and standard crawler files:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
