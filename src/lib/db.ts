import pkg from 'pg';
const { Pool } = pkg;

declare global {
  var pool: pkg.Pool | undefined;
}

let pool: pkg.Pool;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.trim() === '') {
  console.error('ERRO CRÍTICO: Variável de ambiente DATABASE_URL não está configurada ou está vazia.');
  if (process.env.VERCEL) {
     throw new Error('DATABASE_URL is not set or is empty in the Vercel environment variables');
  }
}

async function createTables() {
    if (!pool) return;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Tabela Profissionais
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

        // 2. Tabela Pacientes (Base)
        await client.query(`
            CREATE TABLE IF NOT EXISTS pacientes (
                id VARCHAR(255) PRIMARY KEY,
                nome TEXT NOT NULL,
                celular VARCHAR(20) NOT NULL
            );
        `);

        // 3. Migração Segura de Colunas (Adiciona se não existir e remove NOT NULL)
        const columns = [
            { name: 'cpf', type: 'VARCHAR(14)' },
            { name: 'sexo', type: 'VARCHAR(50)' },
            { name: 'nascimento', type: 'DATE' },
            { name: 'email', type: 'TEXT' },
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
            { name: 'pais', type: 'TEXT DEFAULT \'Brasil\'' },
            { name: 'created_at', type: 'TIMESTAMPTZ DEFAULT NOW()' }
        ];

        for (const col of columns) {
            // Tenta adicionar a coluna (se não existir)
            await client.query(`
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pacientes' AND column_name='${col.name}') THEN
                        ALTER TABLE pacientes ADD COLUMN ${col.name} ${col.type};
                    END IF;
                END $$;
            `);
            
            // Garante que a coluna NÃO seja obrigatória (exceto nome e celular que já estão na base)
            await client.query(`ALTER TABLE pacientes ALTER COLUMN ${col.name} DROP NOT NULL;`);
        }

        // 4. Tabela de Prontuários
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

        // 5. Tabela de Agendamentos
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

        // 6. Tabela de Transações
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
        console.log("Banco de dados sincronizado com sucesso.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro crítico ao sincronizar banco de dados:", err);
    } finally {
        client.release();
    }
}

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({ connectionString: databaseUrl });
  createTables().catch(console.error);
} else {
  if (!global.pool) {
    global.pool = new Pool({ connectionString: databaseUrl });
    createTables().catch(console.error);
  }
  pool = global.pool;
}

const getPool = () => {
  if (!pool) pool = new Pool({ connectionString: databaseUrl });
  return pool;
};

export default getPool;
