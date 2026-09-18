import { testApiHandler } from "next-test-api-route-handler";
import * as appHandler from "@/app/[slug]/route";
import { prisma } from "@/lib/prisma";

beforeEach(async () => {
  await prisma.click.deleteMany();
  await prisma.link.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createLink(slug: string, originalUrl = "https://example.com/destino-final") {
  return prisma.link.create({
    data: { slug, originalUrl, ownerId: "owner-redirect-tests" },
  });
}

describe("GET /[slug]", () => {
  it("redireciona com 302 e Location correto para um slug existente", async () => {
    await createLink("existe1", "https://example.com/destino-final");

    await testApiHandler({
      appHandler,
      params: { slug: "existe1" },
      test: async ({ fetch }) => {
        // redirect: "manual" — sem isso, o fetch seguiria o redirect de
        // verdade até example.com, tornando o teste dependente de rede e
        // escondendo o 302 que é justamente o que queremos verificar.
        const res = await fetch({ method: "GET", redirect: "manual" });

        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("https://example.com/destino-final");
      },
    });
  });

  it("devolve 404 para um slug inexistente", async () => {
    await testApiHandler({
      appHandler,
      params: { slug: "nao-existe-mesmo" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET", redirect: "manual" });
        expect(res.status).toBe(404);
      },
    });
  });

  it("registra um click com timestamp, referrer e user agent a cada redirect", async () => {
    const link = await createLink("comclick");

    await testApiHandler({
      appHandler,
      params: { slug: "comclick" },
      test: async ({ fetch }) => {
        await fetch({
          method: "GET",
          redirect: "manual",
          headers: {
            referer: "https://twitter.com/algum-post",
            "user-agent": "TesteAgent/1.0",
          },
        });
      },
    });

    const clicks = await prisma.click.findMany({ where: { linkId: link.id } });

    expect(clicks).toHaveLength(1);
    expect(clicks[0].referrer).toBe("https://twitter.com/algum-post");
    expect(clicks[0].userAgent).toBe("TesteAgent/1.0");
    expect(clicks[0].timestamp).toBeInstanceOf(Date);
  });

  it("registra o click mesmo sem referrer/user-agent presentes", async () => {
    const link = await createLink("semheaders");

    await testApiHandler({
      appHandler,
      params: { slug: "semheaders" },
      test: async ({ fetch }) => {
        await fetch({ method: "GET", redirect: "manual" });
      },
    });

    const clicks = await prisma.click.findMany({ where: { linkId: link.id } });
    expect(clicks).toHaveLength(1);
  });

  it("incrementa o contador de clicks a cada redirect para o mesmo slug", async () => {
    const link = await createLink("multiclick");

    for (let i = 0; i < 3; i++) {
      await testApiHandler({
        appHandler,
        params: { slug: "multiclick" },
        test: async ({ fetch }) => {
          await fetch({ method: "GET", redirect: "manual" });
        },
      });
    }

    const count = await prisma.click.count({ where: { linkId: link.id } });
    expect(count).toBe(3);
  });

  it("não confunde clicks de slugs diferentes", async () => {
    const linkA = await createLink("slugA");
    const linkB = await createLink("slugB");

    await testApiHandler({
      appHandler,
      params: { slug: "slugA" },
      test: async ({ fetch }) => {
        await fetch({ method: "GET", redirect: "manual" });
      },
    });

    const countA = await prisma.click.count({ where: { linkId: linkA.id } });
    const countB = await prisma.click.count({ where: { linkId: linkB.id } });

    expect(countA).toBe(1);
    expect(countB).toBe(0);
  });
});
