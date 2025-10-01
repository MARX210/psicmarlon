
import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { z } from "zod";
import bcrypt from 'bcryptjs';

const saltRounds = 10;

const professionalSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string().min(1),
});

export async function GET() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT id, nome, email, role, is_active FROM profissionais ORDER BY nome");
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar profissionais:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar profissionais" },
      { status: 500 }
    );
  } finally {
      if(client) client.release();
  }
}

export async function POST(req: Request) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const body = await req.json();
    const validation = professionalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { nome, email, password, role } = validation.data;
    
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await client.query(
      `
      INSERT INTO profissionais (nome, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nome, email, role, is_active
      `,
      [nome, email, password_hash, role]
    );

    return NextResponse.json(
      { message: "Profissional adicionado com sucesso", professional: result.rows[0] },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("ERRO NO POST de profissionais:", error);
    if (error.code === '23505') { 
        return NextResponse.json({ error: 'Já existe um profissional com este e-mail.' }, { status: 409 });
    }
    return NextResponse.json({ 
      error: "Erro interno no servidor ao adicionar profissional." 
    }, { status: 500 });
  } finally {
      if(client) client.release();
  }
}
