import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { patientRegistrationSchema } from "@/lib/schemas";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get("cpf");
  const search = searchParams.get("search");

  const pool = getPool();
  let client;

  try {
    client = await pool.connect();
    if (cpf) {
      const normalizedCpf = cpf.replace(/\D/g, "");
      const query = "SELECT id, nome, cpf, to_char(nascimento, 'YYYY-MM-DD') as nascimento, celular, email, sexo, tipo_paciente, cartao_id, como_conheceu, cep, logradouro, numero, complemento, bairro, cidade, estado, pais, created_at FROM pacientes WHERE cpf = $1 OR id = $1";
      const result = await client.query(query, [normalizedCpf]);
      return NextResponse.json(result.rows, { status: 200 });
    } else if (search) {
      const query = "SELECT id, nome, cpf, to_char(nascimento, 'YYYY-MM-DD') as nascimento, celular, email, sexo, tipo_paciente, cartao_id, como_conheceu, cep, logradouro, numero, complemento, bairro, cidade, estado, pais, created_at FROM pacientes WHERE nome ILIKE $1 OR cpf ILIKE $1 OR id ILIKE $1 ORDER BY nome LIMIT 50";
      const result = await client.query(query, [`%${search}%`]);
      return NextResponse.json(result.rows, { status: 200 });
    } else {
      const query = "SELECT id, nome, cpf, to_char(nascimento, 'YYYY-MM-DD') as nascimento, celular, email, sexo, tipo_paciente, cartao_id, como_conheceu, cep, logradouro, numero, complemento, bairro, cidade, estado, pais, created_at FROM pacientes ORDER BY nome";
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
        error: "Dados inválidos no formulário.", 
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const {
      cartaoId, nome, cpf, sexo, nascimento, email, celular,
      tipoPaciente, comoConheceu, cep, logradouro,
      numero, complemento, bairro, cidade, estado, pais
    } = validation.data;
    
    let nascimentoISO = null;
    if (nascimento && nascimento.trim() !== "" && nascimento.includes("/")) {
        const parts = nascimento.split("/");
        if (parts.length === 3) {
            const [day, month, year] = parts;
            nascimentoISO = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
    }
    
    const normalizedCelular = celular ? celular.replace(/\D/g, "") : "";
    const normalizedCpf = (cpf && cpf.trim() !== "") ? cpf.replace(/\D/g, "") : null;

    if (!nome || !normalizedCelular) {
        return NextResponse.json({ error: "Nome e Celular são obrigatórios." }, { status: 400 });
    }

    const query = `
      INSERT INTO pacientes (
        id, nome, cpf, sexo, nascimento, email, como_conheceu,
        tipo_paciente, cartao_id, cep, logradouro,
        numero, complemento, bairro, cidade, estado, pais, celular
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *;
    `;

    const values = [
      cartaoId, 
      nome, 
      normalizedCpf, 
      sexo || null, 
      nascimentoISO, 
      email || null, 
      comoConheceu || null,
      tipoPaciente || null, 
      cartaoId, 
      cep || null, 
      logradouro || null, 
      numero || null, 
      complemento || null, 
      bairro || null, 
      cidade || null, 
      estado || null, 
      pais || "Brasil", 
      normalizedCelular
    ];

    const result = await client.query(query, values);
    
    return NextResponse.json({ 
      message: "Paciente adicionado com sucesso!", 
      patient: result.rows[0] 
    }, { status: 201 });

  } catch (error: any) {
    console.error("ERRO NO POST de pacientes:", error);
    
    if (error.code === '23505') { 
        if (error.constraint && error.constraint.includes('cpf')) {
            return NextResponse.json({ error: 'Já existe um paciente com este CPF.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Já existe um paciente com este Nº de Cartão/ID.' }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: "Erro no banco de dados: " + (error.message || "Erro interno desconhecido.")
    }, { status: 500 });
  } finally {
      if(client) client.release();
  }
}