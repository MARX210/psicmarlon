import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { z } from "zod";

// Schema para validação da atualização
const appointmentUpdateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  type: z.enum(["Online", "Presencial"]),
  duration: z.number().positive(),
  price: z.number().nonnegative(),
});

// PUT - Atualizar um agendamento existente
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "ID do agendamento não fornecido" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validation = appointmentUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { date, time, type, duration, price } = validation.data;
    const pool = getPool();

    const result = await pool.query(
      `
      UPDATE agendamentos
      SET date = $1, time = $2, type = $3, duration = $4, price = $5
      WHERE id = $6
      RETURNING 
        id, 
        patient_id AS "patientId", 
        to_char(date, 'YYYY-MM-DD') AS date,
        time, 
        type, 
        duration, 
        price
      `,
      [date, time, type, duration, price, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Agendamento atualizado com sucesso", appointment: result.rows[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao atualizar agendamento:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar agendamento" },
      { status: 500 }
    );
  }
}

// DELETE - Excluir um agendamento
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "ID do agendamento não fornecido" }, { status: 400 });
  }

  try {
    const pool = getPool();
    const result = await pool.query("DELETE FROM agendamentos WHERE id = $1 RETURNING *", [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ message: "Agendamento excluído com sucesso" }, { status: 200 });
  } catch (error) {
    console.error("Erro ao excluir agendamento:", error);
    return NextResponse.json(
      { error: "Erro interno ao excluir agendamento" },
      { status: 500 }
    );
  }
}
