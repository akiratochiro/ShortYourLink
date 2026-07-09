import { customAlphabet } from "nanoid";
import { prisma } from "./prisma";

// Alfabeto sem caracteres ambíguos (sem 0/O, 1/l/I) para evitar
// confusão visual quando alguém digitar o link manualmente.
const alphabet = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const generateRandomSlug = customAlphabet(alphabet, 6);

const MAX_ATTEMPTS = 5;

export async function generateUniqueSlug(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const slug = generateRandomSlug();

    const existing = await prisma.link.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }
  }

  throw new Error(
    "Não foi possível gerar um slug único após várias tentativas."
  );
}