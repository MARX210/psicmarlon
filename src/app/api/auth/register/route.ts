import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  role: z.enum(['medico', 'recepcionista', 'admin']),
});

export async function POST(req: Request) {
  // Em um ambiente de produção, esta rota deve ser protegida
  // para que apenas administradores possam criar novos usuários.
  try {
    const body = await req.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados de registro inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { nome, email, senha, role } = validation.data;
    const pool = getPool();

    // Verifica se o usuário já existe
    const existingUser = await pool.query("SELECT id FROM usuarios WHERE email = $1", [email]);
    if (existingUser.rowCount > 0) {
      return NextResponse.json({ error: "Este email já está em uso" }, { status: 409 });
    }
    
    const hashedPassword = await bcrypt.hash(senha, 10);

    const query = `
      INSERT INTO usuarios (nome, email, senha, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nome, email, role;
    `;
    const values = [nome, email, hashedPassword, role];

    const result = await pool.query(query, values);
    const newUser = result.rows[0];

    return NextResponse.json(
      { message: "Usuário registrado com sucesso!", user: newUser },
      { status: 201 }
    );

  } catch (error) {
    console.error("Erro no registro de usuário:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
