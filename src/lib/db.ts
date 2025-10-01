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
  throw new Error('DATABASE_URL is not set or is empty in the environment variables');
}

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString: databaseUrl,
  });
} else {
  if (!global.pool) {
    global.pool = new Pool({
      connectionString: databaseUrl,
    });
  }
  pool = global.pool;
}


const getPool = () => {
  if (!pool) {
     console.error('ERRO CRÍTICO: Pool de conexões não foi inicializado.');
     throw new Error('Connection pool not initialized');
  }
  return pool;
};

export default getPool;
