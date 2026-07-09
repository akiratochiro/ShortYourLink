import { testApiHandler } from "next-test-api-route-handler";
import * as appHandler from "@/app/api/links/route";
import { prisma } from "@/lib/prisma";

beforeEach(async () => {
  await prisma.click.deleteMany();
  await prisma.link.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/links", () => {
  it("cria um link e retorna 201 com os dados corretos", async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: "https://example.com/pagina" }),
        });

        expect(res.status).toBe(201);

        const data = await res.json();
        expect(data.slug).toHaveLength(6);
        expect(data.originalUrl).toBe("https://example.com/pagina");
        expect(data.ownerId).toBeTruthy();
      },
    });
  });

  it("rejeita URL inválida com 400", async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: "isso não é uma url" }),
        });

        expect(res.status).toBe(400);
      },
    });
  });

  it("define um cookie de sessão na primeira requisição", async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: "https://example.com" }),
        });

        expect(res.headers.get("set-cookie")).toMatch(/syl_session=/);
      },
    });
  });

  it("persiste o link no banco de dados", async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: "https://example.com" }),
        });

        const data = await res.json();
        const saved = await prisma.link.findUnique({ where: { slug: data.slug } });

        expect(saved).not.toBeNull();
        expect(saved?.originalUrl).toBe("https://example.com");
      },
    });
  });
});

describe("GET /api/links", () => {
  it("retorna apenas os links da sessão do próprio visitante", async () => {
    let sessionCookie = "";

    // Primeiro visitante cria um link e recebe um cookie de sessão.
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: "https://do-visitante-um.com" }),
        });
        sessionCookie = res.headers.get("set-cookie") ?? "";
      },
    });

    // Segundo visitante (sem cookie) cria outro link, com sessão diferente.
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        await fetch({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: "https://do-visitante-dois.com" }),
        });
      },
    });

    // O primeiro visitante lista seus links, reenviando o cookie recebido.
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "GET",
          headers: { cookie: sessionCookie },
        });

        const links = await res.json();
        expect(links).toHaveLength(1);
        expect(links[0].originalUrl).toBe("https://do-visitante-um.com");
      },
    });
  });
});