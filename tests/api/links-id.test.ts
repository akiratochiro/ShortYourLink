import { testApiHandler } from "next-test-api-route-handler";
import * as appHandler from "@/app/api/links/[id]/route";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/session";

beforeEach(async () => {
  await prisma.click.deleteMany();
  await prisma.link.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createLink(ownerId: string, slug: string) {
  return prisma.link.create({
    data: { slug, originalUrl: "https://example.com", ownerId },
  });
}

describe("DELETE /api/links/[id]", () => {
  it("exclui um link da própria sessão e devolve 204", async () => {
    const ownerId = "owner-a";
    const link = await createLink(ownerId, "delOk1");

    await testApiHandler({
      appHandler,
      params: { id: link.id },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "DELETE",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${ownerId}` },
        });

        expect(res.status).toBe(204);
      },
    });

    const remaining = await prisma.link.findUnique({ where: { id: link.id } });
    expect(remaining).toBeNull();
  });

  it("apaga os clicks associados via cascade", async () => {
    const ownerId = "owner-cascade";
    const link = await createLink(ownerId, "delCasc");
    await prisma.click.create({ data: { linkId: link.id } });

    await testApiHandler({
      appHandler,
      params: { id: link.id },
      test: async ({ fetch }) => {
        await fetch({
          method: "DELETE",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${ownerId}` },
        });
      },
    });

    const remainingClicks = await prisma.click.count({ where: { linkId: link.id } });
    expect(remainingClicks).toBe(0);
  });

  it("recusa excluir um link de outra sessão, e não apaga nada", async () => {
    const link = await createLink("owner-b", "delOth1");

    await testApiHandler({
      appHandler,
      params: { id: link.id },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "DELETE",
          headers: { cookie: `${SESSION_COOKIE_NAME}=owner-c` },
        });

        expect(res.status).toBe(404);
      },
    });

    const stillThere = await prisma.link.findUnique({ where: { id: link.id } });
    expect(stillThere).not.toBeNull();
  });

  it("devolve 404 ao tentar excluir um link inexistente", async () => {
    await testApiHandler({
      appHandler,
      params: { id: "does-not-exist" },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "DELETE",
          headers: { cookie: `${SESSION_COOKIE_NAME}=owner-a` },
        });

        expect(res.status).toBe(404);
      },
    });
  });

  it("devolve 404 quando não há sessão alguma", async () => {
    const link = await createLink("owner-d", "delNoSess");

    await testApiHandler({
      appHandler,
      params: { id: link.id },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "DELETE" });
        expect(res.status).toBe(404);
      },
    });
  });
});
