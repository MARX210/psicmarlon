import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { z } from 'zod';

const appointmentSchema = z.object({
  patientId: z.string(),
  patientName: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  time: z.string().regex(/^\d{2}:\d{2}$/), // HH:mm
  type: z.enum(["Online", "Presencial"]),
  duration: z.number().positive(),
  price: z.number().nonnegative(),
});

// GET - Buscar todos os agendamentos
export async function GET() {
  try {
    const query = `
      SELECT 
        a.id, 
        a.patient_id as "patientId", 
        p.nome as "patientName", 
        to_char(a.date, 'YYYY-MM-DD') as date, 
        a.time, 
        a.type, 
        a.duration, 
        a.price 
      FROM Agendamentos a
      JOIN Pacientes p ON a.patient_id = p.id
      ORDER BY a.date, a.time;
    `;
    const result = await pool.query(query);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 });
  }
}

// POST - Criar novo agendamento
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = appointmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: validation.error.flatten() }, { status: 400 });
    }

    const { patientId, date, time, type, duration, price } = validation.data;

    // Supõe-se que uma tabela 'Agendamentos' exista com as colunas correspondentes.
    const query = `
      INSERT INTO Agendamentos (patient_id, date, time, type, duration, price)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, patient_id as "patientId", to_char(date, 'YYYY-MM-DD') as date, time, type, duration, price;
    `;
    const values = [patientId, date, time, type, duration, price];
    const result = await pool.query(query, values);

    // Retorna o agendamento criado, incluindo o nome do paciente
    const newAppointmentData = {
        ...result.rows[0],
        patientName: body.patientName
    };

    return NextResponse.json({ message: 'Agendamento criado', appointment: newAppointmentData }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    return NextResponse.json({ error: 'Erro interno ao criar agendamento' }, { status: 500 });
  }
}
