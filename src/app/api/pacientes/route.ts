import { NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { patientRegistrationSchema } from '@/lib/schemas';

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM Pacientes ORDER BY nome ASC');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar pacientes' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validar com Zod antes de inserir
    const validation = patientRegistrationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: validation.error.flatten() }, { status: 400 });
    }

    const { 
        cartaoId, nome, cpf, sexo, nascimento, email, 
        tipoPaciente, comoConheceu, cep, logradouro, 
        numero, complemento, bairro, cidade, estado, pais 
    } = validation.data;

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
        cartaoId, nome, cpf, sexo, nascimento, email, 
        tipoPaciente, comoConheceu, cep, logradouro, 
        numero, complemento, bairro, cidade, estado, pais
    ];

    const result = await pool.query(query, values);

    return NextResponse.json({ message: 'Paciente adicionado com sucesso', patient: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Erro na API ao adicionar paciente:", error);
    const dbError = error as any;
    if (dbError.code === '23505') { // Código de erro para violação de chave única (ex: CPF duplicado)
        return NextResponse.json({ error: `Erro de duplicidade: ${dbError.detail}` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor ao adicionar paciente.', details: dbError.message }, { status: 500 });
  }
}
