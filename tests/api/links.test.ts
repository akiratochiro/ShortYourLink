import { testApiHandler } from "next-test-api-route-handler";
import * as appHandler from "@/app/api/links/route";
import { prisma } from "@/lib/prisma";
import { LINKS_PAGE_SIZE } from "@/lib/links-pagination";
import { SESSION_COOKIE_NAME } from "@/lib/session";

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
  it("retorna apenas os links da sessão do próprio visitante, nas duas direções", async () => {
    let sessionCookieA = "";
    let sessionCookieB = "";

    // Primeiro visitante cria um link e recebe um cookie de sessão.
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: "https://do-visitante-um.com" }),
        });
        sessionCookieA = res.headers.get("set-cookie") ?? "";
      },
    });

    // Segundo visitante (sem cookie) cria outro link, com sessão diferente.
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: "https://do-visitante-dois.com" }),
        });
        sessionCookieB = res.headers.get("set-cookie") ?? "";
      },
    });

    // O primeiro visitante lista seus links, reenviando o cookie recebido.
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "GET",
          headers: { cookie: sessionCookieA },
        });

        const data = await res.json();
        expect(data.links).toHaveLength(1);
        expect(data.links[0].originalUrl).toBe("https://do-visitante-um.com");
      },
    });

    // E o segundo visitante, na direção oposta, não vê o link do primeiro.
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "GET",
          headers: { cookie: sessionCookieB },
        });

        const data = await res.json();
        expect(data.links).toHaveLength(1);
        expect(data.links[0].originalUrl).toBe("https://do-visitante-dois.com");
      },
    });
  });
});

describe("GET /api/links — paginação", () => {
  const ownerId = "test-owner-pagination";
  const cookie = `${SESSION_COOKIE_NAME}=${ownerId}`;
  const total = LINKS_PAGE_SIZE + 5;

  beforeEach(async () => {
    // createdAt crescente para garantir ordem determinística (mais novo primeiro).
    for (let i = 0; i < total; i++) {
      await prisma.link.create({
        data: {
          slug: `pg${i.toString().padStart(4, "0")}`,
          originalUrl: `https://example.com/${i}`,
          ownerId,
          createdAt: new Date(Date.now() + i * 1000),
        },
      });
    }
  });

  it("retorna a primeira página cheia, com nextCursor e sem prevCursor", async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET", headers: { cookie } });
        const data = await res.json();

        expect(data.links).toHaveLength(LINKS_PAGE_SIZE);
        expect(data.nextCursor).not.toBeNull();
        expect(data.prevCursor).toBeNull();
        // O link mais recente (criado por último) deve vir primeiro.
        expect(data.links[0].originalUrl).toBe(`https://example.com/${total - 1}`);
      },
    });
  });

  it("avança para a segunda página e volta para a primeira sem perder itens", async () => {
    let firstPageIds: string[] = [];
    let nextCursor = "";

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET", headers: { cookie } });
        const data = await res.json();
        firstPageIds = data.links.map((link: { id: string }) => link.id);
        nextCursor = data.nextCursor;
      },
    });

    let secondPageIds: string[] = [];
    let prevCursor = "";

    await testApiHandler({
      appHandler,
      url: `/?cursor=${nextCursor}&direction=next`,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET", headers: { cookie } });
        const data = await res.json();

        expect(data.links).toHaveLength(total - LINKS_PAGE_SIZE);
        expect(data.nextCursor).toBeNull();
        expect(data.prevCursor).not.toBeNull();

        secondPageIds = data.links.map((link: { id: string }) => link.id);
        prevCursor = data.prevCursor;
      },
    });

    // Nenhum item repetido entre as duas páginas.
    expect(secondPageIds.some((id) => firstPageIds.includes(id))).toBe(false);

    await testApiHandler({
      appHandler,
      url: `/?cursor=${prevCursor}&direction=prev`,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET", headers: { cookie } });
        const data = await res.json();

        expect(data.links.map((link: { id: string }) => link.id)).toEqual(firstPageIds);
      },
    });
  });

  it("rejeita um parâmetro direction inválido com 400", async () => {
    await testApiHandler({
      appHandler,
      url: "/?direction=sideways",
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET", headers: { cookie } });
        expect(res.status).toBe(400);
      },
    });
  });
});