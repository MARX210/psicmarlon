export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = patientRegistrationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.flatten() }, { status: 400 });
    }

    const {
      cartaoId, nome, cpf, sexo, nascimento, email,
      tipoPaciente, comoConheceu, cep, logradouro,
      numero, complemento, bairro, cidade, estado, pais
    } = validation.data;

    const pool = getPool();

    const normalizedCpf = cpf.replace(/\D/g, "");
    const nascimentoISO = (() => {
      const [day, month, year] = nascimento.split("/");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    })();

    // Verificar se CPF já existe
    const existingCpf = await pool.query("SELECT id FROM Pacientes WHERE cpf = $1", [normalizedCpf]);
    if (existingCpf.rowCount > 0) {
      return NextResponse.json({ error: 'Já existe um paciente com este CPF.' }, { status: 409 });
    }

    const query = `
      INSERT INTO Pacientes (
        id, nome, cpf, sexo, nascimento, email,
        tipo_paciente, como_conheceu, cep, logradouro,
        numero, complemento, bairro, cidade, estado, pais
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;
    `;
    const values = [
      cartaoId, nome, normalizedCpf, sexo, nascimentoISO, email,
      tipoPaciente, comoConheceu, cep.replace(/\D/g, ""), logradouro,
      numero, complemento, bairro, cidade, estado, pais
    ];

    const result = await pool.query(query, values);
    return NextResponse.json({ message: "Paciente adicionado", patient: result.rows[0] }, { status: 201 });

  } catch (error: any) {
    console.error(error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Já existe um paciente com este CPF.' }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro interno no servidor ao adicionar paciente." }, { status: 500 });
  }
}
