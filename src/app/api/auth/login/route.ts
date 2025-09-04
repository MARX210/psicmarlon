
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body; // Correção: de 'senha' para 'password'

    const userEmail = process.env.USER_EMAIL;
    const userPassword = process.env.USER_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;
    const userName = process.env.USER_NAME || 'Usuário';

    if (!userEmail || !userPassword || !jwtSecret) {
      return NextResponse.json(
        { error: "Variáveis de ambiente não configuradas no servidor." },
        { status: 500 }
      );
    }

    // Verifica as credenciais
    if (email === userEmail && password === userPassword) {
      // Cria o token JWT
      const token = jwt.sign({ name: userName, email: userEmail }, jwtSecret, {
        expiresIn: "1d", // Token expira em 1 dia
      });

      // Define o cookie na resposta
      cookies().set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 1 dia
        path: '/',
      });
      
      return NextResponse.json({ message: "Login bem-sucedido" }, { status: 200 });

    } else {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Erro na API de login:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
