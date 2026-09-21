import { testApiHandler } from "next-test-api-route-handler";
import * as appHandler from "@/app/api/health/route";
import { prisma } from "@/lib/prisma";

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/health", () => {
  it("devolve 200 quando o banco responde", async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ status: "ok", database: "ok" });
      },
    });
  });

  it("devolve 503 sem vazar a mensagem do driver quando o banco falha", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest
      .spyOn(prisma, "$queryRaw")
      .mockRejectedValue(new Error("connect ECONNREFUSED secret-host:5432"));

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        const text = await res.text();

        expect(res.status).toBe(503);
        expect(JSON.parse(text)).toEqual({ status: "error", database: "unreachable" });
        expect(text).not.toContain("secret-host");
      },
    });
  });
});
