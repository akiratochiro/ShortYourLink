import { z } from "zod";

export const createLinkSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "A URL é obrigatória.")
    .url("Informe uma URL válida.")
    .refine((value) => /^https?:\/\//i.test(value), {
      message: "A URL deve começar com http:// ou https://.",
    }),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;