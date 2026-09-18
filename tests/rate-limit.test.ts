import { checkRateLimit } from "@/lib/rate-limit";

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
