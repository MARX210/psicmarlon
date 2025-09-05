
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

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "ID do paciente não fornecido" }, { status: 400 });
  }

  try {
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
    
    const pool = getPool();
    const result = await pool.query(
      `
      UPDATE Pacientes
      SET 
        email = $1, 
        celular = $2, 
        cep = $3, 
        logradouro = $4, 
        numero = $5, 
        complemento = $6, 
        bairro = $7, 
        cidade = $8, 
        estado = $9,
        pais = $10
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
  }
}
