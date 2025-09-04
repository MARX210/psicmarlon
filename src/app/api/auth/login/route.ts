
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    const userEmail = process.env.USER_EMAIL;
    const userPassword = process.env.USER_PASSWORD;

    if (!userEmail || !userPassword) {
      console.error("ERRO: Variáveis de ambiente USER_EMAIL ou USER_PASSWORD não estão configuradas na Vercel.");
      return NextResponse.json(
        { error: "Erro de configuração no servidor. Contate o administrador." },
        { status: 500 }
      );
    }
    
    console.log("INFO: Variáveis de ambiente de login encontradas na Vercel.");

    if (email === userEmail && password === userPassword) {
      return NextResponse.json({ message: "Login bem-sucedido" }, { status: 200 });
    } else {
      console.warn(`Tentativa de login falhou para o email: ${email}`);
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Erro crítico na API de login:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
