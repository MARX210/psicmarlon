
import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { z } from "zod";

const appointmentSchema = z.object({
  patientId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  time: z.string().regex(/^\d{2}:\d{2}$/), // HH:mm
  professional: z.string(),
  type: z.enum(["Online", "Presencial"]),
  duration: z.number().positive(),
  price: z.number().nonnegative(),
  status: z.string().optional(),
});

export async function GET() {
  try {
    const pool = getPool();

    const result = await pool.query(`
      SELECT
        a.id,
        a.patient_id AS "patientId",
        p.nome AS "patientName",
        to_char(a.date, 'YYYY-MM-DD') AS date,
        a.time,
        a.professional,
        a.type,
        a.duration,
        a.price::float,
        a.status
      FROM agendamentos a
      JOIN pacientes p ON a.patient_id = p.id
      ORDER BY a.date, a.time
    `);

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar agendamentos" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
    const pool = getPool();
    const client = await pool.connect();
  try {
    const body = await req.json();
    const validation = appointmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    
    const { patientId, date, time, professional, type, duration, price, status } = validation.data;
    
    await client.query('BEGIN');
    
    // Verificar conflitos de horário antes de inserir
    const conflictCheck = await client.query(
        `SELECT id FROM agendamentos WHERE date = $1 AND time = $2`,
        [date, time]
    );

    if (conflictCheck.rowCount > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Já existe um agendamento neste horário.' }, { status: 409 });
    }


    const result = await client.query(
      `
      INSERT INTO agendamentos (patient_id, date, time, professional, type, duration, price, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id, 
        patient_id AS "patientId", 
        to_char(date, 'YYYY-MM-DD') AS date,
        time,
        professional,
        type, 
        duration, 
        price,
        status
      `,
      [patientId, date, time, professional, type, duration, price, status || 'Confirmado']
    );

    await client.query('COMMIT');
    
    return NextResponse.json(
      { message: "Agendamento criado com sucesso", appointment: result.rows[0] },
      { status: 201 }
    );
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("Erro ao criar agendamento:", error);
    return NextResponse.json(
      { error: "Erro interno ao criar agendamento" },
      { status: 500 }
    );
  } finally {
      client.release();
  }
}
