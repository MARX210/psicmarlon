import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { z } from "zod";

const patientUpdateSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").optional(),
  email: z.string().email("Email inválido").optional().nullable().or(z.literal('')),
  celular: z.string().min(10, "Celular inválido").optional(),
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
  ultima_mensagem_data: z.string().optional().nullable(),
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
    
    // Validação flexível para permitir atualização de apenas um campo (como data de contato)
    const validation = patientUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Caso de uso: Botão "Já avisei" (Apenas data de contato)
    if (Object.keys(body).length === 1 && 'ultima_mensagem_data' in body) {
        const result = await client.query(
          'UPDATE pacientes SET ultima_mensagem_data = $1 WHERE id = $2 RETURNING *', 
          [data.ultima_mensagem_data, id]
        );
        if (result.rowCount === 0) return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
        return NextResponse.json({ message: "Data de contato atualizada", patient: result.rows[0] });
    }

    // Caso de uso: Ativar/Inativar (Apenas is_active)
    if (Object.keys(body).length === 1 && 'is_active' in body) {
        const result = await client.query('UPDATE pacientes SET is_active = $1 WHERE id = $2 RETURNING *', [data.is_active, id]);
        if (result.rowCount === 0) return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
        return NextResponse.json({ message: "Status atualizado", patient: result.rows[0] });
    }

    // Atualização completa (Cadastro)
    const { 
        nome, email, celular, cpf, sexo, nascimento, como_conheceu,
        cep, logradouro, numero, complemento, bairro, cidade, estado, pais, is_active, ultima_mensagem_data
    } = data;
    
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
        nome = COALESCE($1, nome), 
        email = COALESCE($2, email), 
        celular = COALESCE($3, celular), 
        cpf = COALESCE($4, cpf), 
        sexo = COALESCE($5, sexo), 
        nascimento = COALESCE($6, nascimento), 
        como_conheceu = COALESCE($7, como_conheceu), 
        cep = COALESCE($8, cep), 
        logradouro = COALESCE($9, logradouro), 
        numero = COALESCE($10, numero), 
        complemento = COALESCE($11, complemento), 
        bairro = COALESCE($12, bairro), 
        cidade = COALESCE($13, cidade), 
        estado = COALESCE($14, estado), 
        pais = COALESCE($15, pais),
        is_active = COALESCE($16, is_active),
        ultima_mensagem_data = COALESCE($17, ultima_mensagem_data)
      WHERE id = $18
      RETURNING *
      `,
      [
        nome ?? null, email ?? null, celular ?? null, cpf ?? null, sexo ?? null, nascimentoISO, 
        como_conheceu ?? null, cep ?? null, logradouro ?? null, numero ?? null, 
        complemento ?? null, bairro ?? null, cidade ?? null, estado ?? null, pais ?? null, 
        is_active ?? null,
        ultima_mensagem_data ?? null,
        id
      ]
    );

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