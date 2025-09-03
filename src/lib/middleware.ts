import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const userCookie = request.cookies.get('user');
  const user = userCookie ? userCookie.value : null;

  const { pathname } = request.nextUrl;

  const publicRoutes = ['/login'];
  const isPublicRoute = publicRoutes.includes(pathname);

  if (!isPublicRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
