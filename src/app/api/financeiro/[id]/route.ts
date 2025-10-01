
import { NextResponse } from "next/server";
import getPool from "@/lib/db";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "ID da transação inválido" }, { status: 400 });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    const result = await client.query("DELETE FROM transacoes WHERE id = $1 RETURNING *", [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ message: "Transação excluída com sucesso" }, { status: 200 });
  } catch (error) {
    console.error("Erro ao excluir transação:", error);
    return NextResponse.json({ error: "Erro interno ao excluir transação" }, { status: 500 });
  } finally {
      if(client) client.release();
  }
}
