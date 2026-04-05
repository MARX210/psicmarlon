
import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { z } from "zod";

const transactionUpdateSchema = z.object({
  description: z.string().min(1),
  amount: z.coerce.number(),
  type: z.enum(['receita_consulta', 'receita_outros', 'despesa']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "ID da transação inválido" }, { status: 400 });
  }

  const pool = getPool();
  let client;

  try {
    client = await pool.connect();
    const body = await req.json();
    const validation = transactionUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.flatten() }, { status: 400 });
    }

    const { description, amount, type, date } = validation.data;
    const finalAmount = Math.abs(amount);

    await client.query('BEGIN');

    // 1. Verifica se a transação existe e se tem agendamento vinculado
    const transResult = await client.query('SELECT agendamento_id FROM transacoes WHERE id = $1', [id]);
    if (transResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }
    const { agendamento_id } = transResult.rows[0];

    // 2. Atualiza a transação
    const result = await client.query(
      `
      UPDATE transacoes 
      SET date = $1, description = $2, amount = $3, type = $4
      WHERE id = $5
      RETURNING id, to_char(date, 'YYYY-MM-DD') as date, description, amount, type
      `,
      [date, description, finalAmount, type, id]
    );

    // 3. Se for uma receita de consulta vinculada, atualiza o preço no agendamento
    if (agendamento_id) {
      await client.query(
        'UPDATE agendamentos SET price = $1 WHERE id = $2',
        [finalAmount, agendamento_id]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ message: "Transação atualizada com sucesso", transaction: result.rows[0] }, { status: 200 });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error("Erro ao atualizar transação:", error);
    return NextResponse.json({ error: "Erro interno ao atualizar transação" }, { status: 500 });
  } finally {
      if(client) client.release();
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "ID da transação inválido" }, { status: 400 });
  }

  const pool = getPool();
  let client;

  try {
    client = await pool.connect();
    const result = await client.query("DELETE FROM transacoes WHERE id = $1 RETURNING *", [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ message: "Transação excluída com sucesso" }, { status: 200 });
  } catch (error) {
    console.error("Erro ao excluir transação:", error);
    return NextResponse.json({ error: "Erro interno ao excluir transação" }, { status: 500 });
  } finally {
      if(client) client.release();
  }
}
