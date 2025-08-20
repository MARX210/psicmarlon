import { z } from "zod";

export const patientRegistrationSchema = z.object({
  nome: z.string().min(3, { message: "O nome completo é obrigatório." }),
  cpf: z.string().min(11, { message: "O CPF é obrigatório." }),
  sexo: z.string().optional(),
  nascimento: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data de nascimento inválida." }),
  email: z.string().email({ message: "Por favor, insira um email válido." }).optional().or(z.literal('')),
  comoConheceu: z.string().optional(),
  tipoPaciente: z.string({ required_error: "Selecione o tipo de paciente."}),
  cartaoId: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  pais: z.string().optional(),
});
