import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const user = request.cookies.get('user') || localStorage.getItem('user'); // Verifica de ambas as formas
  const { pathname } = request.nextUrl;

  // Rotas públicas
  const publicRoutes = ['/login'];
  const isPublicRoute = publicRoutes.includes(pathname);
  
  // Se não está em rota pública e não tem usuário logado, redireciona para login
  if (!isPublicRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Se está logado e tenta acessar login, redireciona para home
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};