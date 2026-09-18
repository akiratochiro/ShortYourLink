import { checkRateLimit, isRateLimitEnabled, rateLimitResponseHeaders } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("permite requisições até o limite, dentro da mesma janela", () => {
    const key = `test:${Math.random()}`;

    for (let i = 0; i < 3; i++) {
      const result = checkRateLimit(key, 3, 60_000);
      expect(result.allowed).toBe(true);
    }
  });

  it("bloqueia a requisição que excede o limite na mesma janela", () => {
    const key = `test:${Math.random()}`;

    checkRateLimit(key, 2, 60_000);
    checkRateLimit(key, 2, 60_000);
    const third = checkRateLimit(key, 2, 60_000);

    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("libera novamente após a janela expirar", async () => {
    const key = `test:${Math.random()}`;

    checkRateLimit(key, 1, 10);
    const blocked = checkRateLimit(key, 1, 10);
    expect(blocked.allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 20));

    const afterWindow = checkRateLimit(key, 1, 10);
    expect(afterWindow.allowed).toBe(true);
  });

  it("mantém contadores independentes por chave", () => {
    const keyA = `a:${Math.random()}`;
    const keyB = `b:${Math.random()}`;

    checkRateLimit(keyA, 1, 60_000);
    const resultA = checkRateLimit(keyA, 1, 60_000);
    const resultB = checkRateLimit(keyB, 1, 60_000);

    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });
});

describe("isRateLimitEnabled", () => {
  it("fica desabilitado durante a suíte de testes (NODE_ENV=test)", () => {
    expect(isRateLimitEnabled()).toBe(false);
  });
});

describe("rateLimitResponseHeaders", () => {
  it("monta Retry-After e os headers X-RateLimit-* a partir do resultado", () => {
    const result = checkRateLimit(`headers:${Math.random()}`, 5, 60_000);
    const headers = rateLimitResponseHeaders(result) as Record<string, string>;

    expect(headers["X-RateLimit-Limit"]).toBe("5");
    expect(headers["X-RateLimit-Remaining"]).toBe("4");
    expect(Number(headers["Retry-After"])).toBeGreaterThan(0);
  });

  it("nunca devolve Retry-After negativo, mesmo se resetAt já passou", () => {
    const headers = rateLimitResponseHeaders({
      allowed: false,
      limit: 1,
      remaining: 0,
      resetAt: Date.now() - 1000,
    }) as Record<string, string>;

    expect(headers["Retry-After"]).toBe("0");
  });
});
