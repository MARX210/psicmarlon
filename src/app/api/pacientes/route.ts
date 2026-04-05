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
    
    // Verifica se a coluna ultima_mensagem_data existe para evitar erro 500 na query
    const columnCheck = await client.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='pacientes' AND column_name='ultima_mensagem_data'
    `);
    const hasContactColumn = columnCheck.rowCount !== null && columnCheck.rowCount > 0;

    const baseQuery = `
      SELECT 
        id, 
        nome, 
        COALESCE(cpf, '') as cpf, 
        to_char(nascimento, 'YYYY-MM-DD') as nascimento, 
        celular, 
        COALESCE(email, '') as email, 
        sexo, 
        tipo_paciente, 
        cartao_id, 
        como_conheceu, 
        cep, 
        logradouro, 
        numero, 
        complemento, 
        bairro, 
        cidade, 
        estado, 
        pais, 
        created_at,
        COALESCE(is_active, TRUE) as is_active
        ${hasContactColumn ? ', ultima_mensagem_data' : ', NULL as ultima_mensagem_data'}
      FROM pacientes
    `;

    if (cpf) {
      const normalizedCpf = cpf.replace(/\D/g, "");
      const result = await client.query(`${baseQuery} WHERE cpf = $1 OR id = $1`, [normalizedCpf]);
      return NextResponse.json(result.rows, { status: 200 });
    } else if (search) {
      const result = await client.query(`${baseQuery} WHERE nome ILIKE $1 OR cpf ILIKE $1 OR id ILIKE $1 ORDER BY nome LIMIT 50`, [`%${search}%`]);
      return NextResponse.json(result.rows, { status: 200 });
    } else {
      const result = await client.query(`${baseQuery} ORDER BY created_at DESC`);
      return NextResponse.json(result.rows, { status: 200 });
    }
  } catch (error: any) {
    console.error("Erro no GET de pacientes:", error);
    return NextResponse.json({ error: "Erro ao buscar pacientes: " + error.message }, { status: 500 });
  } finally {
    if (client) client.release();
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
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.flatten() }, { status: 400 });
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

    const query = `
      INSERT INTO pacientes (
        id, nome, cpf, sexo, nascimento, email, como_conheceu,
        tipo_paciente, cartao_id, cep, logradouro,
        numero, complemento, bairro, cidade, estado, pais, celular, created_at, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), TRUE)
      RETURNING *;
    `;

    const values = [
      cartaoId, nome, normalizedCpf, sexo || null, nascimentoISO, email || null,
      comoConheceu || null, tipoPaciente || null, cartaoId, cep || null,
      logradouro || null, numero || null, complemento || null, bairro || null,
      cidade || null, estado || null, pais || "Brasil", normalizedCelular
    ];

    const result = await client.query(query, values);
    return NextResponse.json({ message: "Paciente adicionado!", patient: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error("ERRO NO POST de pacientes:", error);
    return NextResponse.json({ error: "Erro no banco de dados: " + error.message }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}