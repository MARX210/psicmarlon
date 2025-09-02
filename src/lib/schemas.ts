
import { z } from "zod";

// Função para validar datas no formato dd/mm/yyyy e não futuras
const isValidDate = (dateString: string) => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return false;
  const [day, month, year] = dateString.split("/").map(Number);
  if (!day || !month || !year) return false;

  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date <= today
  );
};

// Transforma uma string vazia em nulo, útil para campos opcionais
const emptyStringToNull = z.literal("").transform(() => null);

export const patientRegistrationSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string()
    .min(1, "CPF é obrigatório")
    .transform((cpf) => cpf.replace(/\D/g, "")), // Remove máscara
  sexo: z.enum(["Masculino", "Feminino", "Outro", "Prefiro não informar"], { required_error: "Sexo é obrigatório" }),
  nascimento: z.string()
    .min(1, "Data de nascimento é obrigatória")
    .refine(isValidDate, { message: "Data de nascimento inválida ou futura" }),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  celular: z.string().optional().or(emptyStringToNull).nullable().transform(val => val ? val.replace(/\D/g, "") : null),
  comoConheceu: z.string().optional(),
  tipoPaciente: z.preprocess(
    (val) => (typeof val === 'string' && val.length > 0 ? parseInt(val, 10) : undefined),
    z.number({ required_error: "Tipo de paciente é obrigatório" }).int().min(1).max(4)
  ),
  cartaoId: z.string().optional(),
  cep: z.string().optional().or(emptyStringToNull).nullable().transform(val => val ? val.replace(/\D/g, "") : null),
  logradouro: z.string().min(1, "Logradouro é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  estado: z.string().min(1, "Estado é obrigatório"),
  pais: z.string().min(1, "País é obrigatório"),
});
