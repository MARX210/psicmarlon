import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Função para obter a chave secreta de forma segura
const getSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não está definido nas variáveis de ambiente');
  }
  return new TextEncoder().encode(secret);
};

// Função para verificar o token
async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as { role: string; [key: string]: any };
  } catch (error) {
    console.error('Erro de verificação do token:', error);
    return null; // Retorna nulo se a verificação falhar
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const publicRoutes = ['/login'];
  const isApiAuthRoute = pathname.startsWith('/api/auth');

  // A rota de login e as rotas de API de autenticação são sempre públicas
  if (publicRoutes.includes(pathname) || isApiAuthRoute) {
    // Se o usuário já está logado e tenta acessar /login, redireciona para a home
    if (token && pathname === '/login') {
      const decoded = await verifyToken(token);
      if (decoded) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
    return NextResponse.next();
  }

  // Se não há token e a rota não é pública, redireciona para login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Se há token, verifica sua validade
  const decoded = await verifyToken(token);

  // Se o token for inválido, redireciona para o login e limpa o cookie
  if (!decoded) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }

  // Aqui você pode adicionar lógica de autorização baseada em 'role'
  // Exemplo:
  // const isAdminRoute = pathname.startsWith('/admin');
  // if (isAdminRoute && decoded.role !== 'admin') {
  //   return NextResponse.redirect(new URL('/', request.url));
  // }

  return NextResponse.next();
}

export const config = {
  // Ignora arquivos estáticos, imagens e a favicon
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|images/).*)'],
};
