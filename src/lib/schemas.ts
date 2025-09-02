
import { z } from "zod";

const isValidDate = (dateString: string) => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return false;
  const [day, month, year] = dateString.split("/").map(Number);
  if (!day || !month || !year) return false;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date < new Date()
  );
};

export const patientRegistrationSchema = z.object({
  nome: z.string().min(3, { message: "O nome completo é obrigatório e deve ter no mínimo 3 caracteres." }),
  cpf: z.string()
    .min(1, { message: "O CPF é obrigatório."})
    .transform((cpf) => cpf.replace(/\D/g, ''))
    .refine((cpf) => cpf.length === 11, { message: "O CPF deve conter 11 dígitos." }),
  sexo: z.string().optional().or(z.literal('')),
  nascimento: z.string()
    .min(1, { message: "Data de nascimento é obrigatória." })
    .refine(isValidDate, { message: "Data de nascimento inválida ou futura." })
    .transform((dateStr) => {
        const [day, month, year] = dateStr.split("/");
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }),
  email: z.string().email({ message: "Por favor, insira um email válido." }).optional().or(z.literal('')),
  comoConheceu: z.string().optional().or(z.literal('')),
  tipoPaciente: z.preprocess(
    (val) => (val ? parseInt(String(val), 10) : undefined),
    z.number({ required_error: "Selecione o tipo de paciente."}).positive({ message: "Selecione o tipo de paciente."})
  ),
  cartaoId: z.string().min(1, { message: "ID do cartão não foi gerado. Selecione o tipo de paciente." }),
  cep: z.string().optional().or(z.literal('')),
  logradouro: z.string().optional().or(z.literal('')),
  numero: z.string().optional().or(z.literal('')),
  complemento: z.string().optional().or(z.literal('')),
  bairro: z.string().optional().or(z.literal('')),
  cidade: z.string().optional().or(z.literal('')),
  estado: z.string().optional().or(z.literal('')),
  pais: z.string().optional().or(z.literal('')),
});
