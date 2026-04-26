import { z } from "zod";

export const supportSubjects = [
  "produto",
  "pedido-entrega",
  "trocas-devolucoes",
  "sugestao",
  "reclamacao",
  "parceria",
  "outro"
] as const;

export const supportSubjectLabels: Record<(typeof supportSubjects)[number], string> = {
  outro: "Outro",
  parceria: "Parceria",
  "pedido-entrega": "Pedido e entrega",
  produto: "Dúvida sobre produto",
  reclamacao: "Reclamação",
  sugestao: "Sugestão",
  "trocas-devolucoes": "Trocas e devoluções"
};

export const supportRequestSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido.").max(120),
  message: z.string().trim().min(20, "Escreva pelo menos 20 caracteres.").max(1800),
  name: z.string().trim().min(2, "Informe seu nome.").max(100),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  subject: z.enum(supportSubjects)
});

export type SupportRequestInput = z.infer<typeof supportRequestSchema>;
