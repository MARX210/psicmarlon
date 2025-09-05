
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
      const normalizedCpf = cpf.replace(/\D/g, "");
      const query = "SELECT id, nome as name, cpf, to_char(nascimento, 'YYYY-MM-DD') as nascimento, celular FROM Pacientes WHERE cpf = $1";
      const result = await pool.query(query, [normalizedCpf]);
      return NextResponse.json(result.rows, { status: 200 });
    } else {
      // Query to get all fields needed for the patient list and edit form
      const query = "SELECT id, nome as name, cpf, to_char(nascimento, 'YYYY-MM-DD') as nascimento, celular, email, cep, logradouro, numero, complemento, bairro, cidade, estado, pais FROM Pacientes ORDER BY nome";
      const result = await pool.query(query);
      return NextResponse.json(result.rows, { status: 200 });
    }

  } catch (error) {
    console.error("Erro no GET:", error);
    return NextResponse.json({ error: "Erro ao buscar paciente(s)" }, { status: 500 });
  }
}

// POST - Cadastrar novo paciente
export async function POST(req: Request) {
  try {
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
    
    const pool = getPool();

    // Converte a data
    const [day, month, year] = nascimento.split("/");
    const nascimentoISO = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    // Normaliza celular
    const normalizedCelular = celular ? celular.replace(/\D/g, "") : null;

    // Query corrigida com ordem correta
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
      cartaoId,        // 1. id
      nome,            // 2. nome
      cpf.replace(/\D/g, ""), // 3. cpf
      sexo,            // 4. sexo
      nascimentoISO,   // 5. nascimento
      email,           // 6. email
      comoConheceu,    // 7. como_conheceu
      tipoPaciente,    // 8. tipo_paciente
      cartaoId,        // 9. cartao_id
      cep,             // 10. cep
      logradouro,      // 11. logradouro
      numero,          // 12. numero
      complemento,     // 13. complemento
      bairro,          // 14. bairro
      cidade,          // 15. cidade
      estado,          // 16. estado
      pais,            // 17. pais
      normalizedCelular // 18. celular
    ];

    const result = await pool.query(query, values);
    
    return NextResponse.json({ 
      message: "Paciente adicionado com sucesso!", 
      patient: result.rows[0] 
    }, { status: 201 });

  } catch (error: any) {
    console.error("ERRO NO POST:", error);
    
    if (error.code === '23505') {
      return NextResponse.json({ 
        error: 'Já existe um paciente com este CPF.' 
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: "Erro interno no servidor ao adicionar paciente." 
    }, { status: 500 });
  }
}
