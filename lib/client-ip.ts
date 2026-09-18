import { NextRequest } from "next/server";

/**
 * `NextRequest.ip` foi removido no Next.js 15 — o IP do cliente agora só
 * chega via cabeçalhos de proxy. Em produção (Render) o `x-forwarded-for`
 * é preenchido pelo proxy reverso da plataforma; localmente, cai no fallback.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}
