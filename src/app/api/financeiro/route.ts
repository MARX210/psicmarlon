
import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import { z } from "zod";

const transactionSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(['receita_outros', 'despesa']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// GET - Buscar todas as transações
export async function GET() {
  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT 
        id::text, 
        to_char(date, 'YYYY-MM-DD') as date, 
        description, 
        amount::float, 
        type
      FROM transacoes 
      ORDER BY date DESC
    `);
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar transações" },
      { status: 500 }
    );
  }
}

// POST - Adicionar nova transação
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = transactionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { description, amount, type, date } = validation.data;
    const pool = getPool();

    const result = await pool.query(
      `
      INSERT INTO transacoes (date, description, amount, type)
      VALUES ($1, $2, $3, $4)
      RETURNING id, to_char(date, 'YYYY-MM-DD') as date, description, amount, type
      `,
      [date, description, amount, type]
    );

    return NextResponse.json(
      { message: "Transação adicionada com sucesso", transaction: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar transação:", error);
    return NextResponse.json(
      { error: "Erro interno ao criar transação" },
      { status: 500 }
    );
  }
}

    