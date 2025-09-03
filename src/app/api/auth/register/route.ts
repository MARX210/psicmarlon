
import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Schema de validação para registro
const registerSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  email: z.string().email("Email inválido."),
  senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  role: z.enum(["medico", "recepcionista", "admin"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { nome, email, senha, role } = validation.data;
    const pool = getPool();

    // Verifica se o email já existe
    const existingUser = await pool.query("SELECT id FROM usuarios WHERE email = $1", [email]);
    if (existingUser.rowCount > 0) {
      return NextResponse.json({ error: "Este email já está em uso." }, { status: 409 });
    }

    // Criptografa a senha antes de salvar
    const hashedPassword = await bcrypt.hash(senha, 10);

    const result = await pool.query(
      `
      INSERT INTO usuarios (nome, email, senha, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nome, email, role
      `,
      [nome, email, hashedPassword, role]
    );

    return NextResponse.json(
      { message: "Usuário registrado com sucesso!", user: result.rows[0] },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("Erro ao registrar usuário:", error);
    if (error.code === '23505') {
       return NextResponse.json({ error: "Este email já está em uso." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro interno ao registrar usuário." }, { status: 500 });
  }
}
