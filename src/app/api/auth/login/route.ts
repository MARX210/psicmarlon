import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sign } from 'jsonwebtoken';

const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  senha: z.string().min(1, 'A senha é obrigatória.'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados de login inválidos.', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { email, senha } = validation.data;

    // Credenciais armazenadas no backend via variáveis de ambiente
    const userEmail = process.env.USER_EMAIL;
    const userSenha = process.env.USER_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!userEmail || !userSenha || !jwtSecret) {
      console.error("Variáveis de ambiente não configuradas: USER_EMAIL, USER_PASSWORD, JWT_SECRET");
      return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 });
    }

    if (email !== userEmail || senha !== userSenha) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }
    
    // O nome do usuário para exibir no header. Pode vir do .env ou ser fixo.
    const userName = process.env.USER_NAME || 'Dr. Marlon';

    const token = sign(
      { email, nome: userName, role: 'admin' }, // Adicionando nome e role ao token
      jwtSecret,
      { expiresIn: '1d' } // Token expira em 1 dia
    );

    const response = NextResponse.json({ message: 'Login bem-sucedido!' });
    
    // Define o cookie como httpOnly para segurança
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 dia
      path: '/',
      sameSite: 'lax',
    });

    return response;

  } catch (error) {
    console.error("Erro na API de login:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
