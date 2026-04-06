import { Pool } from 'pg';

declare global {
  var pool: Pool | undefined;
}

let pool: Pool;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl.trim() === '') {
  console.error('ERRO CRÍTICO: Variável de ambiente DATABASE_URL não está configurada ou está vazia.');
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

    // 2. Tabela Pacientes
    await client.query(`
      CREATE TABLE IF NOT EXISTS pacientes (
        id VARCHAR(255) PRIMARY KEY,
        nome TEXT NOT NULL,
        celular VARCHAR(20) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);

    // 3. Migração Pacientes
    const patientColumns = [
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
      { name: 'created_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
      { name: 'ultima_mensagem_data', type: 'TIMESTAMPTZ' }
    ];

    for (const col of patientColumns) {
      await client.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pacientes' AND column_name='${col.name.toLowerCase()}') THEN
            ALTER TABLE pacientes ADD COLUMN ${col.name} ${col.type};
          END IF;
        END $$;
      `);
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
        type VARCHAR(20) NOT NULL,
        duration INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (patient_id) REFERENCES pacientes(id) ON DELETE CASCADE
      );
    `);

    // Migração Agendamentos (Colunas novas)
    const appointmentColumns = [
      { name: 'professional', type: 'TEXT DEFAULT \'Dr. Marlon\'' },
      { name: 'status', type: 'VARCHAR(20) DEFAULT \'Confirmado\'' }
    ];

    for (const col of appointmentColumns) {
      await client.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agendamentos' AND column_name='${col.name.toLowerCase()}') THEN
            ALTER TABLE agendamentos ADD COLUMN ${col.name} ${col.type};
          END IF;
        END $$;
      `);
    }

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

    // 7. Índices para Performance (Otimização da lentidão)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pacientes_nome ON pacientes (nome);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pacientes_cpf ON pacientes (cpf);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pacientes_id ON pacientes (id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_agendamentos_date ON agendamentos (date);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_agendamentos_patient_id ON agendamentos (patient_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transacoes_date ON transacoes (date);`);

    await client.query('COMMIT');
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error("Erro ao sincronizar banco de dados:", err);
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