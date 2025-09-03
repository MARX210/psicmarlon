
import { NextResponse } from 'next/server';
import getPool from '@/lib/db';
import { z } from 'zod';
import { sign } from 'jsonwebtoken';
import { cookies } from 'next/headers';

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

    const pool = getPool();
    const userResult = await pool.query('SELECT * FROM Usuarios WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    const user = userResult.rows[0];

    // ATENÇÃO: Comparação de senha em texto plano.
    // Isso corresponde à estrutura do banco de dados fornecida, mas não é seguro.
    // O ideal é usar bcrypt.compare com uma senha hasheada.
    const isPasswordCorrect = senha === user.senha;

    if (!isPasswordCorrect) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      // Este erro é para o desenvolvedor, não deve vazar para o cliente.
      console.error('A variável de ambiente JWT_SECRET não está definida.');
      return NextResponse.json({ error: 'Erro de configuração no servidor.' }, { status: 500 });
    }

    // Criar o token JWT
    const token = sign(
      {
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '1d' } // Token expira em 1 dia
    );

    // Definir o cookie
    cookies().set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 dia
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ message: 'Login bem-sucedido!' }, { status: 200 });

  } catch (error) {
    console.error('Erro no endpoint de login:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
