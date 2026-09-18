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
