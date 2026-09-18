import { NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/client-ip";
import {
  checkRateLimit,
  isRateLimitEnabled,
  rateLimitResponseHeaders,
} from "@/lib/rate-limit";

// Por slug+IP (não só IP): um visitante clicando repetidamente em vários
// links diferentes não deve ser penalizado pelo tráfego de um único link
// popular, e vice-versa. O limite é mais alto que o de criação porque
// cliques legítimos (compartilhamento, retweet, etc.) podem vir em rajada.
const REDIRECT_LIMIT = 30;
const REDIRECT_WINDOW_MS = 60_000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (isRateLimitEnabled()) {
    const ip = getClientIp(request);
    const result = checkRateLimit(
      `redirect:${slug}:${ip}`,
      REDIRECT_LIMIT,
      REDIRECT_WINDOW_MS
    );

    if (!result.allowed) {
      return NextResponse.json(
        { error: "Muitas requisições para este link. Tente novamente em instantes." },
        { status: 429, headers: rateLimitResponseHeaders(result) }
      );
    }
  }

  const link = await prisma.link.findUnique({
    where: { slug },
  });

  if (!link) {
    notFound();
  }

  await prisma.click.create({
    data: {
      linkId: link.id,
      referrer: request.headers.get("referer"),
      userAgent: request.headers.get("user-agent"),
    },
  });

  return NextResponse.redirect(link.originalUrl, { status: 302 });
}