import pkg from 'pg';
const { Pool } = pkg;

let pool: pkg.Pool | null = null;

const getPool = () => {
  if (!pool) {
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') {
      throw new Error('DATABASE_URL is not set or is empty in the environment variables');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
};

export default getPool;