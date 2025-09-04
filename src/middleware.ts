
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const protectedRoutes = ['/', '/agenda', '/cadastro'];
  const isProtectedRoute = protectedRoutes.some(route => pathname === route);

  // Se não há token e o usuário tenta acessar uma rota protegida (exceto a de login)
  if (!token && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  
  // Se há token e o usuário tenta acessar a rota de login, redireciona para a home
  if (token && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Executa o middleware em todas as rotas, exceto as de API e arquivos estáticos
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
};
