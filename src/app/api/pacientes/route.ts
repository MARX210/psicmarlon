
import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { patientRegistrationSchema } from "@/lib/schemas";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get("cpf");

  const pool = getPool();
  let client;

  try {
    client = await pool.connect();
    if (cpf) {
      const normalizedCpf = cpf.replace(/\D/g, "");
      const query = "SELECT id, nome, cpf, to_char(nascimento, 'YYYY-MM-DD') as nascimento, celular FROM Pacientes WHERE cpf = $1 OR id = $1";
      const result = await client.query(query, [normalizedCpf]);
      return NextResponse.json(result.rows, { status: 200 });
    } else {
      const query = "SELECT id, nome, cpf, to_char(nascimento, 'YYYY-MM-DD') as nascimento, celular, email, cep, logradouro, numero, complemento, bairro, cidade, estado, pais FROM Pacientes ORDER BY nome";
      const result = await client.query(query);
      return NextResponse.json(result.rows, { status: 200 });
    }

  } catch (error) {
    console.error("Erro no GET de pacientes:", error);
    return NextResponse.json({ error: "Erro ao buscar paciente(s)" }, { status: 500 });
  } finally {
      if(client) client.release();
  }
}

export async function POST(req: Request) {
  const pool = getPool();
  let client;
  try {
    client = await pool.connect();
    const body = await req.json();
    const validation = patientRegistrationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        error: "Dados inválidos", 
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const {
      cartaoId, nome, cpf, sexo, nascimento, email, celular,
      tipoPaciente, comoConheceu, cep, logradouro,
      numero, complemento, bairro, cidade, estado, pais
    } = validation.data;
    
    const [day, month, year] = nascimento.split("/");
    const nascimentoISO = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const normalizedCelular = celular ? celular.replace(/\D/g, "") : null;

    const query = `
      INSERT INTO Pacientes (
        id, nome, cpf, sexo, nascimento, email, como_conheceu,
        tipo_paciente, cartao_id, cep, logradouro,
        numero, complemento, bairro, cidade, estado, pais, celular
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *;
    `;

    const values = [
      cartaoId, nome, cpf.replace(/\D/g, ""), sexo, nascimentoISO, email, comoConheceu,
      tipoPaciente, cartaoId, cep, logradouro, numero, complemento, bairro, cidade, estado, pais, normalizedCelular
    ];

    const result = await client.query(query, values);
    
    return NextResponse.json({ 
      message: "Paciente adicionado com sucesso!", 
      patient: result.rows[0] 
    }, { status: 201 });

  } catch (error: any) {
    console.error("ERRO NO POST de pacientes:", error);
    if (error.code === '23505') { 
        const isCpf = error.constraint === 'pacientes_cpf_key';
        const isId = error.constraint === 'pacientes_pkey';
        if (isCpf) return NextResponse.json({ error: 'Já existe um paciente com este CPF.' }, { status: 409 });
        if(isId) return NextResponse.json({ error: 'Já existe um paciente com este Nº de Cartão/ID.' }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro interno no servidor ao adicionar paciente." }, { status: 500 });
  } finally {
      if(client) client.release();
  }
}
