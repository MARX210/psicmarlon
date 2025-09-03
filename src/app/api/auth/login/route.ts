import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, senha } = body;

    const pool = getPool();

    // Busca usuário no banco
    const userResult = await pool.query(
      "SELECT id, nome, email, senha FROM usuarios WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const user = userResult.rows[0];
    
    // Verifica senha
    const isPasswordValid = await bcrypt.compare(senha, user.senha);
    
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    // Remove a senha da resposta
    const { senha: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      message: "Login bem-sucedido!",
      user: userWithoutPassword,
    }, { status: 200 });

  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}