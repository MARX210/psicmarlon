import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { z } from "zod";

const patientUpdateSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional().nullable().or(z.literal('')),
  celular: z.string().min(10, "Celular inválido"),
  cpf: z.string().optional().nullable().or(z.literal('')),
  sexo: z.string().optional().nullable().or(z.literal('')),
  nascimento: z.string().optional().nullable().or(z.literal('')),
  como_conheceu: z.string().optional().nullable().or(z.literal('')),
  cep: z.string().optional().nullable().or(z.literal('')),
  logradouro: z.string().optional().nullable().or(z.literal('')),
  numero: z.string().optional().nullable().or(z.literal('')),
  complemento: z.string().optional().nullable().or(z.literal('')),
  bairro: z.string().optional().nullable().or(z.literal('')),
  cidade: z.string().optional().nullable().or(z.literal('')),
  estado: z.string().optional().nullable().or(z.literal('')),
  pais: z.string().optional().nullable().or(z.literal('')),
  is_active: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID do paciente não fornecido" }, { status: 400 });
  }
  
  const pool = getPool();
  let client;

  try {
    client = await pool.connect();
    const body = await req.json();
    
    // Se o corpo contiver apenas is_active, faz um update parcial rápido
    if (Object.keys(body).length === 1 && 'is_active' in body) {
        const result = await client.query('UPDATE pacientes SET is_active = $1 WHERE id = $2 RETURNING *', [body.is_active, id]);
        if (result.rowCount === 0) return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
        return NextResponse.json({ message: "Status atualizado", patient: result.rows[0] });
    }

    const validation = patientUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { 
        nome, email, celular, cpf, sexo, nascimento, como_conheceu,
        cep, logradouro, numero, complemento, bairro, cidade, estado, pais, is_active
    } = validation.data;
    
    let nascimentoISO = null;
    if (nascimento && nascimento.includes("/")) {
      const parts = nascimento.split("/");
      if (parts.length === 3) {
        const [day, month, year] = parts;
        nascimentoISO = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    } else if (nascimento) {
      nascimentoISO = nascimento;
    }

    const result = await client.query(
      `
      UPDATE pacientes
      SET 
        nome = $1, email = $2, celular = $3, cpf = $4, sexo = $5, nascimento = $6, 
        como_conheceu = $7, cep = $8, logradouro = $9, numero = $10, 
        complemento = $11, bairro = $12, cidade = $13, estado = $14, pais = $15,
        is_active = COALESCE($16, is_active)
      WHERE id = $17
      RETURNING *
      `,
      [
        nome, email || null, celular, cpf || null, sexo || null, nascimentoISO, 
        como_conheceu || null, cep || null, logradouro || null, numero || null, 
        complemento || null, bairro || null, cidade || null, estado || null, pais || "Brasil", 
        is_active === undefined ? null : is_active,
        id
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Paciente atualizado com sucesso", patient: result.rows[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao atualizar paciente:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar paciente" },
      { status: 500 }
    );
  } finally {
      if(client) client.release();
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID do paciente não fornecido" }, { status: 400 });
  }

  const pool = getPool();
  let client;

  try {
    client = await pool.connect();
    const result = await client.query("DELETE FROM pacientes WHERE id = $1 RETURNING *", [id]);
    if (result.rowCount === 0) return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Erro ao excluir paciente:", error);
    return NextResponse.json({ error: "Erro interno ao excluir paciente" }, { status: 500 });
  } finally {
      if (client) client.release();
  }
}