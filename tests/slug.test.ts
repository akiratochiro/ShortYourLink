import { generateUniqueSlug } from "@/lib/slug";
import { prisma } from "@/lib/prisma";

// Substitui o módulo real do Prisma por uma versão falsa.
// Isso é o que torna esse um teste UNITÁRIO: nenhuma conexão
// real com o banco acontece durante os testes abaixo.
jest.mock("@/lib/prisma", () => ({
  prisma: {
    link: {
      findUnique: jest.fn(),
    },
  },
}));

describe("generateUniqueSlug", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("retorna um slug com 6 caracteres, no alfabeto esperado", async () => {
    (prisma.link.findUnique as jest.Mock).mockResolvedValue(null);

    const slug = await generateUniqueSlug();

    expect(slug).toHaveLength(6);
    expect(slug).toMatch(/^[23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ]+$/);
  });

  it("tenta novamente quando encontra colisão, e retorna um slug livre", async () => {
    (prisma.link.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: "existing-1" }) // 1ª tentativa: colide
      .mockResolvedValueOnce(null);                 // 2ª tentativa: livre

    const slug = await generateUniqueSlug();

    expect(prisma.link.findUnique).toHaveBeenCalledTimes(2);
    expect(slug).toHaveLength(6);
  });

  it("lança erro após esgotar as tentativas, se tudo colidir", async () => {
    (prisma.link.findUnique as jest.Mock).mockResolvedValue({ id: "existing" });

    await expect(generateUniqueSlug()).rejects.toThrow(
      "Não foi possível gerar um slug único"
    );
    expect(prisma.link.findUnique).toHaveBeenCalledTimes(5);
  });
});