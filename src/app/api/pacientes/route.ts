

import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { patientRegistrationSchema } from "@/lib/schemas";

// GET - Buscar pacientes
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get("cpf");

  try {
    const pool = getPool();
    
    if (cpf) {
      // Busca paciente específico pelo CPF
      const normalizedCpf = cpf.replace(/\D/g, ""); // Remove pontos e traços
      const query = "SELECT id, nome as name, cpf, to_char(nascimento, 'YYYY-MM-DD') as nascimento FROM Pacientes WHERE cpf = $1";
      const result = await pool.query(query, [normalizedCpf]);
      return NextResponse.json(result.rows, { status: 200 });
    } else {
      // Busca todos os pacientes
      const query = "SELECT id, nome as name, cpf, to_char(nascimento, 'YYYY-MM-DD') as nascimento FROM Pacientes ORDER BY nome";
      const result = await pool.query(query);
      return NextResponse.json(result.rows, { status: 200 });
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar paciente(s)" }, { status: 500 });
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
      cartaoId, nome, cpf, sexo, nascimento, email, celular,
      tipoPaciente, comoConheceu, cep, logradouro,
      numero, complemento, bairro, cidade, estado, pais
    } = validation.data;
    
    const pool = getPool();

    // Converte a data de DD/MM/YYYY para YYYY-MM-DD para o banco de dados
    const [day, month, year] = nascimento.split("/");
    const nascimentoISO = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    
    // Garante que os dados com máscara sejam limpos antes de inserir
    const normalizedCpf = cpf.replace(/\D/g, "");
    const normalizedCelular = celular ? celular.replace(/\D/g, "") : null;
    const normalizedCep = cep ? cep.replace(/\D/g, "") : null;

    const query = `
      INSERT INTO Pacientes (
        id, nome, cpf, sexo, nascimento, email, celular,
        tipo_paciente, como_conheceu, cep, logradouro,
        numero, complemento, bairro, cidade, estado, pais
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *;
    `;
    const values = [
      cartaoId, nome, normalizedCpf, sexo, nascimentoISO, email || null, normalizedCelular,
      tipoPaciente, comoConheceu || null, normalizedCep, logradouro,
      numero, complemento || null, bairro, cidade, estado, pais
    ];

    const result = await pool.query(query, values);
    return NextResponse.json({ message: "Paciente adicionado", patient: result.rows[0] }, { status: 201 });

  } catch (error: any) {
    console.error('Erro detalhado ao inserir paciente:', error);
     // Trata erro de CPF duplicado (unique constraint)
    if (error.code === '23505' && error.constraint === 'pacientes_cpf_key') {
       return NextResponse.json({ error: 'Já existe um paciente com este CPF.' }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro interno no servidor ao adicionar paciente." }, { status: 500 });
  }
}
