
import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 });
    }

    const result = await client.query('SELECT * FROM profissionais WHERE email = $1', [email]);

    if (result.rowCount === 0) {
      console.warn(`Tentativa de login falhou (usuário não encontrado): ${email}`);
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const professional = result.rows[0];

    if (!professional.is_active) {
        console.warn(`Tentativa de login falhou (usuário inativo): ${email}`);
        return NextResponse.json({ error: "Usuário bloqueado. Contate o administrador." }, { status: 403 });
    }
    
    const isPasswordValid = await bcrypt.compare(password, professional.password_hash);

    if (!isPasswordValid) {
      console.warn(`Tentativa de login falhou (senha incorreta): ${email}`);
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }
    
    const user = {
      id: professional.id,
      name: professional.nome,
      email: professional.email,
      role: professional.role,
    };

    return NextResponse.json({ message: "Login bem-sucedido", user }, { status: 200 });

  } catch (error) {
    console.error("Erro crítico na API de login:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  } finally {
    if (client) {
        client.release();
    }
  }
}
