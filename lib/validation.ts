import { z } from "zod";
import { isPrivateOrLoopbackHost } from "./url-safety";

export const createLinkSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "A URL é obrigatória.")
    .url("Informe uma URL válida.")
    .refine((value) => /^https?:\/\//i.test(value), {
      message: "A URL deve começar com http:// ou https://.",
    })
    .refine(
      (value) => {
        try {
          return !isPrivateOrLoopbackHost(new URL(value).hostname);
        } catch {
          return false;
        }
      },
      {
        message: "Não é permitido encurtar links para endereços locais ou privados.",
      }
    ),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;

// Compartilhado entre app/dashboard/page.tsx e GET /api/links, para que os
// dois pontos de leitura validem exatamente os mesmos parâmetros de paginação.
export const linksQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  direction: z.enum(["next", "prev"]).optional(),
});

export type LinksQueryInput = z.infer<typeof linksQuerySchema>;