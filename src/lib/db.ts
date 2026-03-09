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
        await client.query('BEGIN');

        // Garantir que a tabela profissionais existe (essencial para o setup)
        await client.query(`
            CREATE TABLE IF NOT EXISTS profissionais (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE
            );
        `);

        // Criar ou atualizar a tabela pacientes
        await client.query(`
            CREATE TABLE IF NOT EXISTS pacientes (
                id VARCHAR(255) PRIMARY KEY,
                nome TEXT NOT NULL,
                cpf VARCHAR(14) UNIQUE,
                sexo VARCHAR(50),
                nascimento DATE,
                email TEXT,
                celular VARCHAR(20) NOT NULL,
                como_conheceu TEXT,
                tipo_paciente INTEGER,
                cartao_id VARCHAR(255),
                cep VARCHAR(10),
                logradouro TEXT,
                numero VARCHAR(20),
                complemento TEXT,
                bairro TEXT,
                cidade TEXT,
                estado VARCHAR(50),
                pais TEXT DEFAULT 'Brasil'
            );
        `);

        // Verificar e adicionar colunas faltantes caso a tabela já existisse de forma simplificada
        const columnsToCheck = [
            { name: 'sexo', type: 'VARCHAR(50)' },
            { name: 'como_conheceu', type: 'TEXT' },
            { name: 'tipo_paciente', type: 'INTEGER' },
            { name: 'cartao_id', type: 'VARCHAR(255)' },
            { name: 'cep', type: 'VARCHAR(10)' },
            { name: 'logradouro', type: 'TEXT' },
            { name: 'numero', type: 'VARCHAR(20)' },
            { name: 'complemento', type: 'TEXT' },
            { name: 'bairro', type: 'TEXT' },
            { name: 'cidade', type: 'TEXT' },
            { name: 'estado', type: 'VARCHAR(50)' },
            { name: 'pais', type: 'TEXT DEFAULT \'Brasil\'' }
        ];

        for (const col of columnsToCheck) {
            await client.query(`
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pacientes' AND column_name='${col.name}') THEN
                        ALTER TABLE pacientes ADD COLUMN ${col.name} ${col.type};
                    END IF;
                END $$;
            `);
        }

        // Tabela de prontuários
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

        // Tabela de agendamentos
        await client.query(`
            CREATE TABLE IF NOT EXISTS agendamentos (
                id SERIAL PRIMARY KEY,
                patient_id VARCHAR(255) NOT NULL,
                date DATE NOT NULL,
                time VARCHAR(5) NOT NULL,
                professional TEXT NOT NULL,
                type VARCHAR(20) NOT NULL,
                duration INTEGER NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'Confirmado',
                FOREIGN KEY (patient_id) REFERENCES pacientes(id) ON DELETE CASCADE
            );
        `);

        // Tabela de transações
        await client.query(`
            CREATE TABLE IF NOT EXISTS transacoes (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL,
                description TEXT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                type VARCHAR(20) NOT NULL,
                agendamento_id INTEGER UNIQUE,
                FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE CASCADE
            );
        `);

        await client.query('COMMIT');
        console.log("Esquema do banco de dados sincronizado com sucesso.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro ao sincronizar o esquema do banco de dados:", err);
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