
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
  status: z.string(), // Mantido como string para validação posterior
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

  const pool = getPool();
  const client = await pool.connect();

  try {
    const body = await req.json();
    
    await client.query('BEGIN');

    // Buscar o estado atual do agendamento ANTES de qualquer alteração
    const currentAppointmentResult = await client.query('SELECT * FROM agendamentos WHERE id = $1', [id]);
    if (currentAppointmentResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }
    const currentAppointment = currentAppointmentResult.rows[0];
    const oldStatus = currentAppointment.status;

    // Busca o nome do paciente para usar na descrição da transação
    const pacienteResult = await client.query('SELECT nome FROM pacientes WHERE id = $1', [currentAppointment.patient_id]);
    const patientName = pacienteResult.rows[0]?.nome || 'Paciente';

    let updatedAppointmentData: any;
    let newStatus: string;

    // Se o corpo contiver mais do que apenas o status, é uma edição completa
    if (Object.keys(body).length > 1) {
        const validation = appointmentUpdateSchema.safeParse(body);
        if (!validation.success) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: "Dados de atualização completa inválidos", details: validation.error.flatten() }, { status: 400 });
        }
        updatedAppointmentData = validation.data;
        newStatus = updatedAppointmentData.status;

        const result = await client.query(
            `
            UPDATE agendamentos
            SET date = $1, time = $2, type = $3, duration = $4, price = $5, status = $7, professional = $8
            WHERE id = $6
            RETURNING *
            `,
            [updatedAppointmentData.date, updatedAppointmentData.time, updatedAppointmentData.type, updatedAppointmentData.duration, updatedAppointmentData.price, id, newStatus, updatedAppointmentData.professional]
        );
        updatedAppointmentData = result.rows[0];

    } else { // Caso contrário, é apenas uma atualização de status
        const validation = statusUpdateSchema.safeParse(body);
        if (!validation.success) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: "Dados de atualização de status inválidos", details: validation.error.flatten() }, { status: 400 });
        }
        const { status } = validation.data;
        newStatus = status;

        const result = await client.query(
            `
            UPDATE agendamentos
            SET status = $1
            WHERE id = $2
            RETURNING *
            `,
            [newStatus, id]
        );
        updatedAppointmentData = result.rows[0];
    }
    
    // Lógica de transação unificada
    if (newStatus === 'Pago' && oldStatus !== 'Pago') {
        // Cria transação se não existir com a descrição simplificada
        await client.query(
            `INSERT INTO transacoes (date, description, amount, type, agendamento_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (agendamento_id) DO NOTHING`,
            [updatedAppointmentData.date, `Consulta - ${patientName}`, updatedAppointmentData.price, 'receita_consulta', id]
        );
    } else if (newStatus !== 'Pago' && oldStatus === 'Pago') {
        // Remove transação se o status deixar de ser 'Pago'
        await client.query('DELETE FROM transacoes WHERE agendamento_id = $1', [id]);
    }
    
    await client.query('COMMIT');
    
    // Normaliza o retorno para corresponder à estrutura do frontend
    const responseData = {
        id: updatedAppointmentData.id,
        patientId: updatedAppointmentData.patient_id,
        date: new Date(updatedAppointmentData.date).toISOString().split('T')[0], // Formato YYYY-MM-DD
        time: updatedAppointmentData.time,
        professional: updatedAppointmentData.professional,
        type: updatedAppointmentData.type,
        duration: updatedAppointmentData.duration,
        price: parseFloat(updatedAppointmentData.price),
        status: updatedAppointmentData.status
    };

    return NextResponse.json(
      { message: "Agendamento atualizado com sucesso", appointment: responseData },
      { status: 200 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Erro ao atualizar agendamento:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar agendamento" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE - Excluir um agendamento
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "ID do agendamento não fornecido" }, { status: 400 });
  }
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    // Antes de excluir o agendamento, exclui a transação associada.
    // Isso garante que o financeiro fique consistente.
    await client.query('DELETE FROM transacoes WHERE agendamento_id = $1', [id]);
    
    // Agora, exclui o agendamento
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
    return NextResponse.json(
      { error: "Erro interno ao excluir agendamento" },
      { status: 500 }
    );
  } finally {
      client.release();
  }
}
