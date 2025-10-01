
import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { z } from "zod";

const appointmentUpdateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  professional: z.string(),
  type: z.enum(["Online", "Presencial"]),
  duration: z.number().positive(),
  price: z.number().nonnegative(),
  status: z.string(),
});

const statusUpdateSchema = z.object({
  status: z.enum(["Confirmado", "Realizado", "Cancelado", "Faltou", "Pago"]),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "ID do agendamento não fornecido" }, { status: 400 });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    const body = await req.json();
    await client.query('BEGIN');

    const currentAppointmentResult = await client.query('SELECT * FROM agendamentos WHERE id = $1', [id]);
    if (currentAppointmentResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }
    const currentAppointment = currentAppointmentResult.rows[0];
    const oldStatus = currentAppointment.status;

    const pacienteResult = await client.query('SELECT nome FROM pacientes WHERE id = $1', [currentAppointment.patient_id]);
    const patientName = pacienteResult.rows[0]?.nome || 'Paciente';

    let updatedAppointmentData: any;
    let newStatus: string;

    if (Object.keys(body).length > 1) {
      const validation = appointmentUpdateSchema.safeParse(body);
      if (!validation.success) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: "Dados de atualização inválidos", details: validation.error.flatten() }, { status: 400 });
      }
      const data = validation.data;
      newStatus = data.status;

      const conflictCheck = await client.query(
        `SELECT id FROM agendamentos WHERE date = $1 AND time = $2 AND id != $3`,
        [data.date, data.time, id]
      );
      if (conflictCheck.rowCount > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Já existe um agendamento neste horário.' }, { status: 409 });
      }

      const result = await client.query(
        `UPDATE agendamentos
         SET date = $1, time = $2, type = $3, duration = $4, price = $5, status = $6, professional = $7
         WHERE id = $8 RETURNING *`,
        [data.date, data.time, data.type, data.duration, data.price, newStatus, data.professional, id]
      );
      updatedAppointmentData = result.rows[0];
    } else {
      const validation = statusUpdateSchema.safeParse(body);
      if (!validation.success) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: "Dados de atualização de status inválidos", details: validation.error.flatten() }, { status: 400 });
      }
      const { status } = validation.data;
      newStatus = status;
      const result = await client.query('UPDATE agendamentos SET status = $1 WHERE id = $2 RETURNING *', [newStatus, id]);
      updatedAppointmentData = result.rows[0];
    }

    if (newStatus === 'Pago' && oldStatus !== 'Pago') {
      await client.query(
        `INSERT INTO transacoes (date, description, amount, type, agendamento_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (agendamento_id) DO NOTHING`,
        [updatedAppointmentData.date, `Consulta - ${patientName}`, updatedAppointmentData.price, 'receita_consulta', id]
      );
    } else if (newStatus !== 'Pago' && oldStatus === 'Pago') {
      await client.query('DELETE FROM transacoes WHERE agendamento_id = $1', [id]);
    }

    await client.query('COMMIT');

    const responseData = {
      id: updatedAppointmentData.id,
      patientId: updatedAppointmentData.patient_id,
      date: new Date(updatedAppointmentData.date).toISOString().split('T')[0],
      time: updatedAppointmentData.time,
      professional: updatedAppointmentData.professional,
      type: updatedAppointmentData.type,
      duration: updatedAppointmentData.duration,
      price: parseFloat(updatedAppointmentData.price),
      status: updatedAppointmentData.status
    };
    return NextResponse.json({ message: "Agendamento atualizado com sucesso", appointment: responseData }, { status: 200 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Erro ao atualizar agendamento:", error);
    return NextResponse.json({ error: "Erro interno ao atualizar agendamento" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "ID do agendamento não fornecido" }, { status: 400 });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    await client.query('DELETE FROM transacoes WHERE agendamento_id = $1', [id]);
    
    const result = await client.query("DELETE FROM agendamentos WHERE id = $1 RETURNING *", [id]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }
    
    await client.query('COMMIT');

    return NextResponse.json({ message: "Agendamento e transação associada (se houver) foram excluídos com sucesso" }, { status: 200 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Erro ao excluir agendamento:", error);
    return NextResponse.json({ error: "Erro interno ao excluir agendamento" }, { status: 500 });
  } finally {
      if (client) client.release();
  }
}
