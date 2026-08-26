import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password'];

function isValidJwtFormat(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every(p => p.length > 0);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '?'))) {
    return NextResponse.next();
  }

  // Protect /dashboard and all sub-paths
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('internalx_token')?.value;

    if (!token || !isValidJwtFormat(token)) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      if (token) {
        response.cookies.delete('internalx_token');
        response.cookies.delete('internalx_user');
      }
      return response;
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
