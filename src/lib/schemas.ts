import { z } from "zod";

// Função para validar datas no formato dd/mm/yyyy e não futuras (opcional)
const isValidDate = (dateString: string | null | undefined) => {
  if (!dateString || dateString.trim() === "") return true; // Permite vazio
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

export const patientRegistrationSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string().optional().nullable().or(z.literal('')),
  sexo: z.enum(["Masculino", "Feminino", "Outro", "Prefiro não informar"]).optional().nullable().or(z.literal('')),
  nascimento: z.string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .refine(isValidDate, { message: "Data de nascimento inválida ou futura" }),
  email: z.string().email("Email inválido").optional().nullable().or(z.literal('')),
  celular: z.string().min(10, "Celular é obrigatório e deve estar completo"),
  tipoPaciente: z.number().optional().nullable().or(z.literal(undefined)),
  comoConheceu: z.string().optional().nullable().or(z.literal('')),
  cartaoId: z.string().min(1, "ID do cartão é obrigatório"), // Gerado automaticamente
  cep: z.string().optional().nullable().or(z.literal('')),
  logradouro: z.string().optional().nullable().or(z.literal('')),
  numero: z.string().optional().nullable().or(z.literal('')),
  complemento: z.string().optional().nullable().or(z.literal('')),
  bairro: z.string().optional().nullable().or(z.literal('')),
  cidade: z.string().optional().nullable().or(z.literal('')),
  estado: z.string().optional().nullable().or(z.literal('')),
  pais: z.string().optional().nullable().or(z.literal('')),
});