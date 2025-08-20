import pkg from 'pg';
const { Pool } = pkg;

// Adicionado para lidar com o fato de que process.env.DATABASE_URL pode ser undefined ou vazio
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') {
  throw new Error('DATABASE_URL is not set or is empty in the environment variables');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default pool;
