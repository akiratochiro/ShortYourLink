/**
 * Rate limiter em memória, de janela fixa, para uma única instância do processo.
 *
 * Trade-off consciente: não usa Redis (ou similar) porque o deploy atual
 * (Render, tier gratuito) roda uma única instância — não há estado
 * compartilhado entre processos para sincronizar. Isso significa que os
 * limites são "por instância": se a aplicação escalar horizontalmente no
 * futuro, cada instância passa a ter sua própria contagem, e o limite
 * efetivo por visitante multiplica pelo número de instâncias. Para o
 * escopo deste projeto (portfolio, instância única), isso é aceitável;
 * documentado em README.md.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Evita crescimento ilimitado do Map quando há muitas chaves distintas
// (ex: um IP diferente por requisição de redirect). A limpeza é feita de
// forma probabilística a cada chamada, em vez de um setInterval, para não
// manter o processo "vivo" artificialmente nem exigir timers fake nos testes.
const SWEEP_PROBABILITY = 0.01;

function sweepExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Verifica e consome uma unidade do limite associado a `key`, usando uma
 * janela fixa de `windowMs` milissegundos. Cada chamada bem-sucedida ou
 * bloqueada conta como uma tentativa.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  if (Math.random() < SWEEP_PROBABILITY) {
    sweepExpiredBuckets(now);
  }

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, limit, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, limit, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    limit,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Limites reais são desligados durante a suíte de testes (NODE_ENV=test,
 * definido automaticamente pelo Jest) para manter os testes de integração
 * determinísticos — eles disparam várias requisições POST na mesma "janela"
 * a partir do mesmo IP simulado. O algoritmo em si é coberto isoladamente
 * por tests/rate-limit.test.ts, sem depender desse gate.
 */
export function isRateLimitEnabled(): boolean {
  return process.env.NODE_ENV !== "test";
}

export function rateLimitResponseHeaders(result: RateLimitResult): HeadersInit {
  const retryAfterSeconds = Math.max(
    0,
    Math.ceil((result.resetAt - Date.now()) / 1000)
  );

  return {
    "Retry-After": String(retryAfterSeconds),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
  };
}
