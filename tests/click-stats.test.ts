import { getDailyClickCountsForLinks } from "@/lib/click-stats";
import { prisma } from "@/lib/prisma";

// Testa a lógica de preenchimento de dias (a parte que vale a pena cobrir
// sem banco); a query em si é exercitada pelos testes de integração do
// dashboard/API, que rodam contra um Postgres real.
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

describe("getDailyClickCountsForLinks", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("retorna um mapa vazio e não consulta o banco quando não há links", async () => {
    const result = await getDailyClickCountsForLinks([]);

    expect(result.size).toBe(0);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("preenche com 0 os dias sem clique, mantendo a contagem dos dias com clique", async () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      { linkId: "link-1", day: today, count: BigInt(3) },
    ]);

    const result = await getDailyClickCountsForLinks(["link-1"], 7);
    const series = result.get("link-1");

    expect(series).toHaveLength(7);
    expect(series?.[6].count).toBe(3); // último dia da série é hoje
    expect(series?.slice(0, 6).every((day) => day.count === 0)).toBe(true);
  });

  it("devolve série totalmente zerada para links sem clique no período", async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

    const result = await getDailyClickCountsForLinks(["link-1", "link-2"], 7);

    expect(result.get("link-1")?.every((day) => day.count === 0)).toBe(true);
    expect(result.get("link-2")?.every((day) => day.count === 0)).toBe(true);
  });

  it("distribui as contagens corretamente entre múltiplos links", async () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      { linkId: "link-1", day: today, count: BigInt(2) },
      { linkId: "link-2", day: today, count: BigInt(5) },
    ]);

    const result = await getDailyClickCountsForLinks(["link-1", "link-2"], 7);

    expect(result.get("link-1")?.[6].count).toBe(2);
    expect(result.get("link-2")?.[6].count).toBe(5);
  });
});
