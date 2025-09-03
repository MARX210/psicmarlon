
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Remove o cookie do token
    cookies().set('token', '', {
      httpOnly: true,
      maxAge: 0, // Expira o cookie imediatamente
      path: '/',
    });

    return NextResponse.json({ message: 'Logout bem-sucedido' }, { status: 200 });
  } catch (error) {
    console.error('Erro no logout:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
