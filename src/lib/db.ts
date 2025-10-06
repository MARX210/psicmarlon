import pkg from 'pg';
const { Pool } = pkg;

// Adicionado para garantir que o pool seja um singleton
declare global {
  var pool: pkg.Pool | undefined;
}

let pool: pkg.Pool;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.trim() === '') {
  console.error('ERRO CRÍTICO: Variável de ambiente DATABASE_URL não está configurada ou está vazia.');
  
  // This will throw during build time on Vercel if the env var is not set.
  if (process.env.VERCEL) {
     throw new Error('DATABASE_URL is not set or is empty in the Vercel environment variables');
  }
}

async function createTables() {
    if (!pool) {
      console.log("Pool not initialized, skipping table creation.");
      return;
    }
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS prontuarios (
                id SERIAL PRIMARY KEY,
                paciente_id VARCHAR(255) NOT NULL,
                profissional_id INTEGER NOT NULL,
                data_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                conteudo TEXT NOT NULL,
                FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
                FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE SET NULL
            );
        `);
        console.log("Tabela 'prontuarios' verificada/criada com sucesso.");
    } catch (err) {
        console.error("Erro ao criar a tabela 'prontuarios':", err);
    } finally {
        client.release();
    }
}


if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString: databaseUrl,
  });
  createTables().catch(console.error);
} else {
  if (!global.pool) {
    global.pool = new Pool({
      connectionString: databaseUrl,
    });
    createTables().catch(console.error);
  }
  pool = global.pool;
}


const getPool = () => {
  if (!pool) {
     console.error('ERRO CRÍTICO: Pool de conexões não foi inicializado.');
     if (process.env.VERCEL) {
        throw new Error('CRITICAL ERROR: Connection pool not initialized in Vercel environment.');
     }
     // For local dev, try to re-initialize
     pool = new Pool({ connectionString: databaseUrl });
     console.log('Re-initializing pool for local development.');
  }
  return pool;
};

export default getPool;
