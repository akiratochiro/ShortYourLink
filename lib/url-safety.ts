import { isIP } from "net";

/**
 * Bloqueio best-effort de hosts privados/locais no momento da criação do
 * link — evita que o encurtador seja usado para apontar para
 * `localhost`, endereços de loopback, ranges privados (RFC 1918) ou o IP
 * de metadata da nuvem (169.254.169.254), que são vetores clássicos de
 * SSRF/abuso quando um encurtador vira um redirecionador "confiável".
 *
 * Limitação conhecida e aceita: isso checa apenas o literal presente na
 * URL (hostname ou IP). Não resolve DNS, então um domínio público que
 * resolve para um IP privado (DNS rebinding) passa por essa checagem.
 * Cobrir isso exigiria resolução de DNS síncrona ou assíncrona no momento
 * da criação *e* uma revalidação no momento do redirect (já que o
 * resultado do DNS pode mudar depois) — escopo desproporcional para um
 * projeto de portfolio sem tráfego real. Ver README.md.
 */
export function isPrivateOrLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();

  if (
    host === "localhost" ||
    host === "localhost.localdomain" ||
    host === "ip6-localhost" ||
    host === "ip6-loopback" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }

  const ipVersion = isIP(host);
  if (ipVersion === 4) return isPrivateIPv4(host);
  if (ipVersion === 6) return isPrivateIPv6(host);

  return false;
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true; // formato inesperado: nega por padrão
  }
  const [a, b] = parts;

  if (a === 0) return true; // 0.0.0.0/8 ("this network")
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (inclui metadata de nuvem)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)

  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  if (normalized === "::1" || normalized === "::") return true; // loopback / unspecified
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7 (unique local)

  // Endereço IPv4 mapeado em IPv6 (::ffff:a.b.c.d) — valida o IPv4 embutido.
  const mappedMatch = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedMatch && isIP(mappedMatch[1]) === 4) {
    return isPrivateIPv4(mappedMatch[1]);
  }

  return false;
}
