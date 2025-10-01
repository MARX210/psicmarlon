
import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { z } from "zod";

const professionalUpdateSchema = z.object({
  is_active: z.boolean(),
});

// PUT - Atualizar status de um profissional (ativar/desativar)
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

    const { is_active } = validation.data;
    const pool = getPool();
    const result = await pool.query(
      "UPDATE profissionais SET is_active = $1 WHERE id = $2 RETURNING *",
      [is_active, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Status do profissional atualizado com sucesso", professional: result.rows[0] },
      { status: 200 }
    );
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
