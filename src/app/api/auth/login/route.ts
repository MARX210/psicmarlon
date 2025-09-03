import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(1, "A senha é obrigatória"),
});

const getSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não está definido nas variáveis de ambiente');
  }
  return new TextEncoder().encode(secret);
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Dados de login inválidos" }, { status: 400 });
    }

    const { email, senha } = validation.data;
    const pool = getPool();

    const userResult = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);

    if (userResult.rowCount === 0) {
      return NextResponse.json({ error: "Email ou senha inválidos" }, { status: 401 });
    }

    const user = userResult.rows[0];
    const isPasswordValid = await bcrypt.compare(senha, user.senha);

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Email ou senha inválidos" }, { status: 401 });
    }

    // Gerar o token JWT
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1d") // Token expira em 1 dia
      .sign(getSecretKey());

    // Remove a senha do objeto de usuário retornado
    const { senha: _, ...userWithoutPassword } = user;

    const response = NextResponse.json({
      message: "Login bem-sucedido!",
      user: userWithoutPassword,
      token,
    }, { status: 200 });

    // Define o token em um cookie HttpOnly e seguro
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 dia
    });

    return response;

  } catch (error) {
    console.error("Erro no endpoint de login:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
