import { testApiHandler } from "next-test-api-route-handler";
import { NextResponse } from "next/server";
import { getOrCreateSessionId, getSessionId, SESSION_COOKIE_NAME } from "@/lib/session";

/**
 * lib/session.ts usa cookies() de next/headers, que só existe dentro do
 * contexto de uma requisição real — por isso não dá pra chamar
 * getOrCreateSessionId()/getSessionId() de um teste unitário comum, mesmo
 * "isolado". Este handler mínimo existe só para este arquivo de teste (não
 * faz parte da aplicação) e serve de veículo para exercitar lib/session.ts
 * via next-test-api-route-handler, no mesmo padrão usado pelas rotas reais.
 */
const sessionProbeHandler = {
  GET: async () => {
    const existingBefore = await getSessionId();
    const id = await getOrCreateSessionId();
    return NextResponse.json({ id, existedBefore: existingBefore !== null });
  },
};

function extractCookiePair(setCookieHeader: string): string {
  return setCookieHeader.split(";")[0];
}

describe("lib/session.ts", () => {
  it("cria um cookie de sessão na primeira visita", async () => {
    await testApiHandler({
      appHandler: sessionProbeHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        const setCookie = res.headers.get("set-cookie") ?? "";
        const data = await res.json();

        expect(setCookie).toMatch(new RegExp(`${SESSION_COOKIE_NAME}=`));
        expect(data.existedBefore).toBe(false);
        expect(data.id).toBeTruthy();
      },
    });
  });

  it("o cookie é HttpOnly e SameSite=Lax", async () => {
    await testApiHandler({
      appHandler: sessionProbeHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        const setCookie = res.headers.get("set-cookie") ?? "";

        expect(setCookie).toMatch(/HttpOnly/i);
        expect(setCookie).toMatch(/SameSite=Lax/i);
      },
    });
  });

  it("reaproveita o cookie existente em vez de recriar em visitas seguintes", async () => {
    let firstId = "";
    let cookiePair = "";

    await testApiHandler({
      appHandler: sessionProbeHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        const data = await res.json();
        firstId = data.id;
        cookiePair = extractCookiePair(res.headers.get("set-cookie") ?? "");
      },
    });

    await testApiHandler({
      appHandler: sessionProbeHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET", headers: { cookie: cookiePair } });
        const data = await res.json();

        expect(data.id).toBe(firstId);
        expect(data.existedBefore).toBe(true);
        // Não deve setar um novo cookie — já reaproveitou o existente.
        expect(res.headers.get("set-cookie")).toBeNull();
      },
    });
  });

  it("visitantes diferentes (sem cookie compartilhado) recebem sessões diferentes", async () => {
    const ids = new Set<string>();

    for (let i = 0; i < 2; i++) {
      await testApiHandler({
        appHandler: sessionProbeHandler,
        test: async ({ fetch }) => {
          const res = await fetch({ method: "GET" });
          const data = await res.json();
          ids.add(data.id);
        },
      });
    }

    expect(ids.size).toBe(2);
  });
});
