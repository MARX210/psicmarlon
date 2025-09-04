import pkg from 'pg';
const { Pool } = pkg;

let pool: pkg.Pool | null = null;

const getPool = () => {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl || databaseUrl.trim() === '') {
      console.error('ERRO: Variável de ambiente DATABASE_URL não está configurada ou está vazia.');
      throw new Error('DATABASE_URL is not set or is empty in the environment variables');
    }
     console.log("INFO: Variável de ambiente DATABASE_URL encontrada.");
    pool = new Pool({
      connectionString: databaseUrl,
    });
  }
  return pool;
};

export default getPool;
