
import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { z } from "zod";
import bcrypt from 'bcryptjs';

const saltRounds = 10;

const professionalUpdateSchema = z.object({
  nome: z.string().min(1, "O nome é obrigatório.").optional(),
  email: z.string().email("O e-mail é inválido.").optional(),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres.").optional().or(z.literal('')),
  role: z.string().min(1, "A função é obrigatória.").optional(),
  is_active: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "ID do profissional inválido" }, { status: 400 });
  }

  const pool = getPool();
  let client;

  try {
    client = await pool.connect();
    const body = await req.json();
    const validation = professionalUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    
    const currentDataResult = await client.query("SELECT * FROM profissionais WHERE id = $1", [id]);
    if (currentDataResult.rowCount === 0) {
        return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 });
    }

    const currentData = currentDataResult.rows[0];
    const updatedData = { ...currentData, ...body };
    
    let { nome, email, password, role, is_active } = updatedData;
    
    if (currentData.role === 'Admin') {
      const adminCountResult = await client.query("SELECT COUNT(*) FROM profissionais WHERE role = 'Admin' AND is_active = TRUE");
      const adminCount = parseInt(adminCountResult.rows[0].count, 10);

      if (adminCount <= 1) {
        if (is_active === false) {
           return NextResponse.json({ error: "O último administrador não pode ser desativado." }, { status: 403 });
        }
        if (role !== 'Admin') {
           return NextResponse.json({ error: "A função do último administrador não pode ser alterada." }, { status: 403 });
        }
      }
    }

    let password_hash = currentData.password_hash;
    
    if (password && password.trim() !== '') {
        password_hash = await bcrypt.hash(password, saltRounds);
    }

    const result = await client.query(
        `UPDATE profissionais 
         SET nome = $1, email = $2, role = $3, is_active = $4, password_hash = $5
         WHERE id = $6 RETURNING id, nome, email, role, is_active`,
        [nome, email, role, is_active, password_hash, id]
    );

    return NextResponse.json(
        { message: "Profissional atualizado com sucesso", professional: result.rows[0] },
        { status: 200 }
    );

  } catch (error) {
    console.error("Erro ao atualizar profissional:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar profissional" },
      { status: 500 }
    );
  } finally {
    if(client) client.release();
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "ID do profissional inválido" }, { status: 400 });
  }

  const pool = getPool();
  let client;
  try {
    client = await pool.connect();
    
    const professionalResult = await client.query("SELECT role FROM profissionais WHERE id = $1", [id]);
    if (professionalResult.rowCount === 0) {
      return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 });
    }

    if (professionalResult.rows[0].role === 'Admin') {
       const adminCountResult = await client.query("SELECT COUNT(*) FROM profissionais WHERE role = 'Admin' AND is_active = TRUE");
       if (parseInt(adminCountResult.rows[0].count, 10) <= 1) {
          return NextResponse.json({ error: "O último administrador não pode ser excluído." }, { status: 403 });
       }
    }

    await client.query("DELETE FROM profissionais WHERE id = $1 RETURNING *", [id]);

    return new Response(null, { status: 204 });

  } catch (error) {
    console.error("Erro ao excluir profissional:", error);
    return NextResponse.json(
      { error: "Erro interno ao excluir profissional" },
      { status: 500 }
    );
  } finally {
    if(client) client.release();
  }
}
