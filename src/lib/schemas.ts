
"use client";
import { z } from "zod";

// Função para validar datas no formato dd/mm/yyyy e não futuras
const isValidDate = (dateString: string) => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return false;
  const [day, month, year] = dateString.split("/").map(Number);
  if (!day || !month || !year) return false;

  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Zera a hora para comparar apenas a data
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date <= today
  );
};

export const patientRegistrationSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string().min(1, "CPF é obrigatório"),
  sexo: z.enum(["Masculino", "Feminino", "Outro", "Prefiro não informar"], { required_error: "Sexo é obrigatório" }),
  nascimento: z.string()
    .min(1, "Data de nascimento é obrigatória")
    .refine(isValidDate, { message: "Data de nascimento inválida ou futura" }),
  email: z.string().email("Email inválido").optional().or(z.literal('')),
  celular: z.string().optional(),
  comoConheceu: z.string().optional(),
  tipoPaciente: z.number({ required_error: "Tipo de paciente é obrigatório" }),
  cartaoId: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().min(1, "Logradouro é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  estado: z.string().min(1, "Estado é obrigatório"),
  pais: z.string().min(1, "País é obrigatório"),
});
