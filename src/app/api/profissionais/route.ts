
import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export async function GET() {
  try {
    const pool = getPool();
    const result = await pool.query("SELECT id, nome, email, role, is_active FROM profissionais ORDER BY nome");
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar profissionais:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar profissionais" },
      { status: 500 }
    );
  }
}
