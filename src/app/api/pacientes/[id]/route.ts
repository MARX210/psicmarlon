
import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { z } from "zod";

const patientUpdateSchema = z.object({
  email: z.string().email("Email inválido").optional().or(z.literal('')),
  celular: z.string().optional().or(z.literal('')),
  cep: z.string().optional().or(z.literal('')),
  logradouro: z.string().optional().or(z.literal('')),
  numero: z.string().optional().or(z.literal('')),
  complemento: z.string().optional(),
  bairro: z.string().optional().or(z.literal('')),
  cidade: z.string().optional().or(z.literal('')),
  estado: z.string().optional().or(z.literal('')),
  pais: z.string().optional().or(z.literal('')),
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
    const validation = patientUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { 
        email, celular, cep, logradouro, numero, complemento, bairro, cidade, estado, pais 
    } = validation.data;
    
    const result = await client.query(
      `
      UPDATE pacientes
      SET 
        email = $1, celular = $2, cep = $3, logradouro = $4, numero = $5, 
        complemento = $6, bairro = $7, cidade = $8, estado = $9, pais = $10
      WHERE id = $11
      RETURNING *
      `,
      [email, celular, cep, logradouro, numero, complemento, bairro, cidade, estado, pais, id]
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

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
    }
    
    return new Response(null, { status: 204 });

  } catch (error) {
    console.error("Erro ao excluir paciente:", error);
    return NextResponse.json({ error: "Erro interno ao excluir paciente" }, { status: 500 });
  } finally {
      if (client) client.release();
  }
}
