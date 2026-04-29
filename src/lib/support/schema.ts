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

export const supportRatingSchema = z.object({
  comment: z.string().trim().max(600).optional().or(z.literal("")),
  rating: z.coerce.number().int().min(1).max(5)
}).refine((value) => value.rating >= 4 || Boolean(value.comment && value.comment.trim().length >= 10), {
  message: "Para notas abaixo de 4 estrelas, conte como podemos melhorar.",
  path: ["comment"]
});

export const supportReopenSchema = z.object({
  reason: z.string().trim().min(10, "Explique brevemente o motivo da reabertura.").max(800)
});

export type SupportRequestInput = z.infer<typeof supportRequestSchema>;
export type SupportRatingInput = z.infer<typeof supportRatingSchema>;
export type SupportReopenInput = z.infer<typeof supportReopenSchema>;
