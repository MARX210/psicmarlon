
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const distinctRoles = searchParams.get("distinctRoles");

  const pool = getPool();
  let client;
  try {
    client = await pool.connect();

    if (distinctRoles === 'true') {
        const result = await client.query(
            "SELECT DISTINCT unnest(string_to_array(role, ',')) as role FROM profissionais WHERE role IS NOT NULL AND role != 'Admin' AND role != ''"
        );
        const roles = result.rows.map(row => row.role.trim());
        return NextResponse.json([...new Set(roles)], { status: 200 }); // Use Set to ensure unique roles
    }

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
  let client;
  try {
    client = await pool.connect();
    const body = await req.json();
    const validation = professionalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Verifica se já existem profissionais cadastrados
    const countResult = await client.query('SELECT COUNT(*) FROM profissionais');
    const professionalCount = parseInt(countResult.rows[0].count, 10);
    
    let { nome, email, password, role } = validation.data;

    // Se for o primeiro profissional, força a role para 'Admin'
    if (professionalCount === 0) {
      role = 'Admin';
    }
    
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await client.query(
      `
      INSERT INTO profissionais (nome, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nome, email, role, is_active
      `,
      [nome, email, password_hash, role]
    );

    await client.query('COMMIT');

    return NextResponse.json(
      { message: "Profissional adicionado com sucesso", professional: result.rows[0] },
      { status: 201 }
    );
  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
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
