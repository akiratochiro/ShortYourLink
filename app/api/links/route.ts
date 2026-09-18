import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLinkSchema, linksQuerySchema } from "@/lib/validation";
import { generateUniqueSlug } from "@/lib/slug";
import { getOrCreateSessionId, SESSION_COOKIE_NAME } from "@/lib/session";
import { getClientIp } from "@/lib/client-ip";
import {
  checkRateLimit,
  isRateLimitEnabled,
  rateLimitResponseHeaders,
} from "@/lib/rate-limit";
import { isKnownMaliciousDomain } from "@/lib/malicious-domains";
import { getLinksPage } from "@/lib/links-pagination";

// Por IP: barra abuso distribuído/anônimo, e não pode ser contornado
// simplesmente apagando o cookie de sessão.
const CREATE_IP_LIMIT = 10;
const CREATE_IP_WINDOW_MS = 60_000;

// Por sessão: camada complementar, mais restritiva, para não punir uma
// rede inteira (ex: NAT corporativo) pelo comportamento de um visitante.
const CREATE_SESSION_LIMIT = 5;
const CREATE_SESSION_WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  if (isRateLimitEnabled()) {
    const ip = getClientIp(request);
    const ipResult = checkRateLimit(
      `create:ip:${ip}`,
      CREATE_IP_LIMIT,
      CREATE_IP_WINDOW_MS
    );

    if (!ipResult.allowed) {
      return NextResponse.json(
        { error: "Muitos links criados em pouco tempo. Tente novamente em instantes." },
        { status: 429, headers: rateLimitResponseHeaders(ipResult) }
      );
    }

    const existingSessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (existingSessionId) {
      const sessionResult = checkRateLimit(
        `create:session:${existingSessionId}`,
        CREATE_SESSION_LIMIT,
        CREATE_SESSION_WINDOW_MS
      );

      if (!sessionResult.allowed) {
        return NextResponse.json(
          { error: "Muitos links criados em pouco tempo. Tente novamente em instantes." },
          { status: 429, headers: rateLimitResponseHeaders(sessionResult) }
        );
      }
    }
  }

  const body = await request.json().catch(() => null);

  const parsed = createLinkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const hostname = new URL(parsed.data.url).hostname;
  if (await isKnownMaliciousDomain(hostname)) {
    return NextResponse.json(
      {
        error:
          "Esse domínio está listado como malicioso em uma blocklist pública e não pode ser encurtado.",
      },
      { status: 400 }
    );
  }

  const ownerId = await getOrCreateSessionId();
  const slug = await generateUniqueSlug();

  const link = await prisma.link.create({
    data: {
      slug,
      originalUrl: parsed.data.url,
      ownerId,
    },
  });

  return NextResponse.json(link, { status: 201 });
}

export async function GET(request: NextRequest) {
  const ownerId = await getOrCreateSessionId();

  const parsedQuery = linksQuerySchema.safeParse({
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    direction: request.nextUrl.searchParams.get("direction") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: parsedQuery.error.issues[0]?.message ?? "Parâmetros de paginação inválidos." },
      { status: 400 }
    );
  }

  const page = await getLinksPage({ ownerId, ...parsedQuery.data });

  return NextResponse.json(page);
}