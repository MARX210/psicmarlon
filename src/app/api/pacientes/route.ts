import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { patientRegistrationSchema } from "@/lib/schemas";

// GET - Buscar paciente pelo CPF
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get("cpf");

  if (!cpf) {
    return NextResponse.json({ error: "CPF não fornecido" }, { status: 400 });
  }

  try {
    const normalizedCpf = cpf.replace(/\D/g, ""); // Remove pontos e traços
    const query = "SELECT id, nome as name, cpf FROM Pacientes WHERE cpf = $1";
    const result = await pool.query(query, [normalizedCpf]);

    // Retorna array vazio se não encontrar paciente
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar paciente" }, { status: 500 });
  }
}

// POST - Cadastrar novo paciente
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = patientRegistrationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const { cartaoId, nome, cpf, sexo, nascimento, email, tipoPaciente } = validation.data;

    const query = `
      INSERT INTO Pacientes (id, nome, cpf, sexo, nascimento, email, tipo_paciente)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [cartaoId, nome, cpf, sexo, nascimento, email, tipoPaciente];
    const result = await pool.query(query, values);

    return NextResponse.json({ message: "Paciente adicionado", patient: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao adicionar paciente" }, { status: 500 });
  }
}
