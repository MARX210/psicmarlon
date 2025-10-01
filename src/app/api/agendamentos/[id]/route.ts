
import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { z } from "zod";

// Schema para validação da atualização completa
const appointmentUpdateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  professional: z.string(),
  type: z.enum(["Online", "Presencial"]),
  duration: z.number().positive(),
  price: z.number().nonnegative(),
  status: z.enum(["Confirmado", "Realizado", "Cancelado", "Faltou", "Pago"]),
});

// Schema para validação da atualização parcial (só o status)
const statusUpdateSchema = z.object({
  status: z.enum(["Confirmado", "Realizado", "Cancelado", "Faltou", "Pago"]),
});


// PUT - Atualizar um agendamento existente
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "ID do agendamento não fornecido" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const pool = getPool();
    let result;

    // Se o corpo contiver mais do que apenas o status, é uma edição completa
    if (Object.keys(body).length > 1) {
        const validation = appointmentUpdateSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: "Dados de atualização completa inválidos", details: validation.error.flatten() }, { status: 400 });
        }
        const { date, time, professional, type, duration, price, status } = validation.data;
        result = await pool.query(
            `
            UPDATE agendamentos
            SET date = $1, time = $2, type = $3, duration = $4, price = $5, status = $7, professional = $8
            WHERE id = $6
            RETURNING *
            `,
            [date, time, type, duration, price, id, status, professional]
        );
    } else { // Caso contrário, é apenas uma atualização de status
        const validation = statusUpdateSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: "Dados de atualização de status inválidos", details: validation.error.flatten() }, { status: 400 });
        }
        const { status } = validation.data;
        result = await pool.query(
            `
            UPDATE agendamentos
            SET status = $1
            WHERE id = $2
            RETURNING *
            `,
            [status, id]
        );
    }


    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }
    
    // Normaliza o retorno para corresponder à estrutura do frontend
    const updatedAppointment = result.rows[0];
    const responseData = {
        id: updatedAppointment.id,
        patientId: updatedAppointment.patient_id,
        date: new Date(updatedAppointment.date).toISOString().split('T')[0], // Formato YYYY-MM-DD
        time: updatedAppointment.time,
        professional: updatedAppointment.professional,
        type: updatedAppointment.type,
        duration: updatedAppointment.duration,
        price: parseFloat(updatedAppointment.price),
        status: updatedAppointment.status
    };


    return NextResponse.json(
      { message: "Agendamento atualizado com sucesso", appointment: responseData },
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
