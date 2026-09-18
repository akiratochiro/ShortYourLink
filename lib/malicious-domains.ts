/**
 * Checagem best-effort contra a blocklist pública da URLhaus (abuse.ch),
 * um dos feeds gratuitos mais usados de domínios/URLs conhecidos por
 * distribuir malware ou phishing — sem necessidade de API key.
 * https://urlhaus.abuse.ch/downloads/hostfile/
 *
 * Isso NÃO é um serviço de reputação completo: cobre apenas hosts já
 * denunciados à URLhaus, não detecta phishing novo ("zero-day"), e falha
 * aberto (não bloqueia) se a lista não puder ser baixada — indisponibilidade
 * do abuse.ch não pode impedir a criação de links legítimos. Documentado
 * como decisão consciente de escopo em README.md.
 */

const URLHAUS_HOSTFILE_URL = "https://urlhaus.abuse.ch/downloads/hostfile/";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — não precisa ser "tempo real"
const FETCH_TIMEOUT_MS = 3000;

let cachedDomains: Set<string> | null = null;
let cachedAt = 0;
let inFlightFetch: Promise<Set<string>> | null = null;

/**
 * Parser puro, isolado do fetch para ser testável sem rede.
 * Formato do hostfile: linhas "IP host" (ex: "127.0.0.1 dominio-malicioso.com"),
 * mais comentários iniciados por "#".
 */
export function parseHostfileToDomains(text: string): Set<string> {
  const domains = new Set<string>();

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const [, host] = trimmed.split(/\s+/);
    if (host) domains.add(host.toLowerCase());
  }

  return domains;
}

async function fetchMaliciousDomains(): Promise<Set<string>> {
  const res = await fetch(URLHAUS_HOSTFILE_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`URLhaus respondeu com status ${res.status}`);
  }

  return parseHostfileToDomains(await res.text());
}

async function getMaliciousDomains(): Promise<Set<string>> {
  // Nunca bate na rede durante a suíte de testes — mesma convenção de
  // lib/rate-limit.ts (isRateLimitEnabled) para manter os testes
  // determinísticos e sem dependência externa.
  if (process.env.NODE_ENV === "test") {
    return cachedDomains ?? new Set();
  }

  const isStale = Date.now() - cachedAt > CACHE_TTL_MS;
  if (cachedDomains && !isStale) {
    return cachedDomains;
  }

  if (inFlightFetch) {
    return inFlightFetch;
  }

  inFlightFetch = fetchMaliciousDomains()
    .then((domains) => {
      cachedDomains = domains;
      cachedAt = Date.now();
      return domains;
    })
    .catch((error) => {
      console.warn(
        "[malicious-domains] Falha ao atualizar blocklist da URLhaus, mantendo cache anterior:",
        error
      );
      return cachedDomains ?? new Set<string>();
    })
    .finally(() => {
      inFlightFetch = null;
    });

  return inFlightFetch;
}

export async function isKnownMaliciousDomain(hostname: string): Promise<boolean> {
  const domains = await getMaliciousDomains();
  return domains.has(hostname.toLowerCase());
}
