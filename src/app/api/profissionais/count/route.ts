
import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export async function GET() {
  const pool = getPool();
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT COUNT(*) FROM profissionais');
    const count = parseInt(result.rows[0].count, 10);
    return NextResponse.json({ count }, { status: 200 });
  } catch (error) {
    console.error("Erro ao contar profissionais:", error);
    // Se a tabela não existir, retorna 0. Isso é importante para o fluxo de setup.
    if (error instanceof Error && (error as any).code === '42P01') { // '42P01' is undefined_table
        return NextResponse.json({ count: 0 }, { status: 200 });
    }
    return NextResponse.json({ error: "Erro interno ao verificar profissionais" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
