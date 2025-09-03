
import { NextResponse } from "next/server";
import getPool from "@/lib/db";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

// Função para obter a chave secreta de forma segura
const getSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não está definido nas variáveis de ambiente');
  }
  return new TextEncoder().encode(secret);
};


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, senha } = body;

    if (!email || !senha) {
        return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 });
    }

    const pool = getPool();

    // Busca usuário ignorando espaços e maiúsculas/minúsculas
    const userResult = await pool.query(
      `SELECT id, nome, email, senha, role
       FROM usuarios
       WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND ativo = true`,
      [email]
    );

    // Se o usuário não for encontrado, as credenciais são inválidas
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const user = userResult.rows[0];

    // Compara a senha fornecida com o hash salvo no banco
    const isPasswordValid = await bcrypt.compare(senha, user.senha);

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }
    
    // Atualiza a data do último login
    await pool.query(
        'UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
    );

    // Cria o token JWT
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h") // Token expira em 1 hora
      .sign(getSecretKey());

    // Remove a senha do objeto do usuário antes de retornar
    const { senha: _, ...userWithoutPassword } = user;
    
    const response = NextResponse.json(
      {
        message: "Login bem-sucedido!",
        user: userWithoutPassword,
      },
      { status: 200 }
    );
    
    // Define o cookie do token
    response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60, // 1 hora
    });

    return response;

  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
