
import { NextResponse } from 'next/server';
import getPool from '@/lib/db';
import { z } from 'zod';
import { sign } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

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
        { error: 'Dados inválidos.', details: validation.error.flatten() },
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

    // Comparar a senha fornecida com a senha (potencialmente plana) no banco
    // Idealmente, a senha no banco estaria hasheada e usaríamos bcrypt.compare
    // Por enquanto, faremos uma comparação direta para corresponder ao seu DB.
    // NOTA DE SEGURANÇA: Armazenar senhas em texto plano é extremamente inseguro.
    // O ideal seria hashear as senhas no momento do cadastro.
    // Ex: const isPasswordCorrect = await bcrypt.compare(senha, user.senha);
    const isPasswordCorrect = senha === user.senha;

    if (!isPasswordCorrect) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error('A chave secreta JWT_SECRET não está definida no .env');
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
    });

    return NextResponse.json({ message: 'Login bem-sucedido!' }, { status: 200 });

  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
