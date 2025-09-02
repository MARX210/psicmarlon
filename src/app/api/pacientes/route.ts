import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { patientRegistrationSchema } from "@/lib/schemas";

// GET - Buscar paciente pelo CPF
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get("cpf");

  if (!cpf) {
    return NextResponse.json({ error: "CPF não fornecido" }, { status: 400 });
  }

  try {
    const pool = getPool();
    const normalizedCpf = cpf.replace(/\D/g, ""); // Remove pontos e traços
    const query = "SELECT id, nome as name, cpf, to_char(nascimento, 'YYYY-MM-DD') as nascimento FROM Pacientes WHERE cpf = $1";
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
      // Retornando os erros de validação para o cliente
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.flatten() }, { status: 400 });
    }

    const {
      cartaoId, nome, cpf, sexo, nascimento, email,
      tipoPaciente, comoConheceu, cep, logradouro,
      numero, complemento, bairro, cidade, estado, pais
    } = validation.data;
    
    const pool = getPool();
    const query = `
      INSERT INTO Pacientes (
        id, nome, cpf, sexo, nascimento, email,
        tipo_paciente, como_conheceu, cep, logradouro,
        numero, complemento, bairro, cidade, estado, pais
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;
    `;
    const values = [
      cartaoId, nome, cpf.replace(/\D/g, ""), sexo, nascimento, email,
      tipoPaciente, comoConheceu, cep, logradouro,
      numero, complemento, bairro, cidade, estado, pais
    ];

    const result = await pool.query(query, values);
    return NextResponse.json({ message: "Paciente adicionado", patient: result.rows[0] }, { status: 201 });

  } catch (error: any) {
    console.error(error);
     // Trata erro de CPF duplicado (unique constraint)
    if (error.code === '23505') {
       return NextResponse.json({ error: 'Já existe um paciente com este CPF.' }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro interno no servidor ao adicionar paciente." }, { status: 500 });
  }
}
