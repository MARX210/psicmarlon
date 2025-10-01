
import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { z } from "zod";
import bcrypt from 'bcryptjs';

const saltRounds = 10;

const professionalUpdateSchema = z.object({
  nome: z.string().min(1, "O nome é obrigatório.").optional(),
  email: z.string().email("O e-mail é inválido.").optional(),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres.").optional(),
  role: z.string().min(1, "A função é obrigatória.").optional(),
  is_active: z.boolean().optional(),
});

// PUT - Atualizar um profissional
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "ID do profissional inválido" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validation = professionalUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    
    const pool = getPool();
    const client = await pool.connect();

    try {
        const currentDataResult = await client.query("SELECT * FROM profissionais WHERE id = $1", [id]);
        if (currentDataResult.rowCount === 0) {
            return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 });
        }

        const currentData = currentDataResult.rows[0];
        const updatedData = { ...currentData, ...body };
        
        let { nome, email, password, role, is_active } = updatedData;
        let password_hash = currentData.password_hash;
        
        // Se uma nova senha for fornecida, criptografe-a
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

    } finally {
        client.release();
    }

  } catch (error) {
    console.error("Erro ao atualizar profissional:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar profissional" },
      { status: 500 }
    );
  }
}


// DELETE - Excluir um profissional
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "ID do profissional inválido" }, { status: 400 });
  }

  try {
    const pool = getPool();
    // Adicionar lógica para reatribuir ou lidar com agendamentos antes de excluir, se necessário.
    const result = await pool.query("DELETE FROM profissionais WHERE id = $1 RETURNING *", [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ message: "Profissional excluído com sucesso" }, { status: 200 });
  } catch (error) {
    console.error("Erro ao excluir profissional:", error);
    return NextResponse.json(
      { error: "Erro interno ao excluir profissional" },
      { status: 500 }
    );
  }
}
