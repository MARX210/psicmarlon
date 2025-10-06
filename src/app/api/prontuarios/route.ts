
import { NextResponse, NextRequest } from "next/server";
import getPool from "@/lib/db";
import { z } from "zod";

const prontuarioSchema = z.object({
  paciente_id: z.string().nonempty(),
  profissional_id: z.string().nonempty(),
  conteudo: z.string().nonempty(),
});

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const pacienteId = searchParams.get("pacienteId");
    const profissionalId = searchParams.get("profissionalId");

    if (!pacienteId) {
        return NextResponse.json({ error: "ID do paciente é obrigatório" }, { status: 400 });
    }

    const pool = getPool();
    let client;

    try {
        client = await pool.connect();
        
        let queryText = `
            SELECT pr.id, pr.conteudo, pr.data_registro, p.nome as profissional_nome
            FROM prontuarios pr
            JOIN profissionais p ON pr.profissional_id = p.id
            WHERE pr.paciente_id = $1
        `;
        const queryParams: any[] = [pacienteId];

        // If profissionalId is provided, filter by it (for non-admins)
        if (profissionalId) {
            queryText += ` AND pr.profissional_id = $2`;
            queryParams.push(profissionalId);
        }

        queryText += ` ORDER BY pr.data_registro DESC`;

        const result = await client.query(queryText, queryParams);
        
        return NextResponse.json(result.rows, { status: 200 });

    } catch (error) {
        console.error("Erro ao buscar prontuários:", error);
        return NextResponse.json({ error: "Erro interno ao buscar prontuários" }, { status: 500 });
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
    const validation = prontuarioSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.flatten() }, { status: 400 });
    }

    const { paciente_id, profissional_id, conteudo } = validation.data;

    const query = `
        INSERT INTO prontuarios (paciente_id, profissional_id, conteudo)
        VALUES ($1, $2, $3)
        RETURNING *;
    `;
    const values = [paciente_id, profissional_id, conteudo];

    const result = await client.query(query, values);

    return NextResponse.json({ message: "Anotação salva com sucesso!", prontuario: result.rows[0] }, { status: 201 });

  } catch (error) {
    console.error("Erro ao criar anotação no prontuário:", error);
    return NextResponse.json({ error: "Erro interno ao salvar anotação" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
