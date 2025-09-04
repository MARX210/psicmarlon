
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    const userEmail = process.env.USER_EMAIL;
    const userPassword = process.env.USER_PASSWORD;

    if (!userEmail || !userPassword) {
      return NextResponse.json(
        { error: "Variáveis de ambiente não configuradas no servidor." },
        { status: 500 }
      );
    }

    if (email === userEmail && password === userPassword) {
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
