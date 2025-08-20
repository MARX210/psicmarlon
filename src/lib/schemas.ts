
import { z } from "zod";

export const patientRegistrationSchema = z.object({
  nome: z.string().min(3, { message: "O nome completo é obrigatório e deve ter no mínimo 3 caracteres." }),
  cpf: z.string().min(11, { message: "O CPF deve ter no mínimo 11 dígitos." }),
  sexo: z.string().optional().or(z.literal('')),
  nascimento: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "Data de nascimento é obrigatória." }),
  email: z.string().email({ message: "Por favor, insira um email válido." }).optional().or(z.literal('')),
  comoConheceu: z.string().optional().or(z.literal('')),
  tipoPaciente: z.coerce.number({ required_error: "Selecione o tipo de paciente."}).positive(),
  cartaoId: z.string().min(1, { message: "ID do cartão não foi gerado." }),
  cep: z.string().optional().or(z.literal('')),
  logradouro: z.string().optional().or(z.literal('')),
  numero: z.string().optional().or(z.literal('')),
  complemento: z.string().optional().or(z.literal('')),
  bairro: z.string().optional().or(z.literal('')),
  cidade: z.string().optional().or(z.literal('')),
  estado: z.string().optional().or(z.literal('')),
  pais: z.string().optional().or(z.literal('')),
});
