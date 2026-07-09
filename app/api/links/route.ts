import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLinkSchema } from "@/lib/validation";
import { generateUniqueSlug } from "@/lib/slug";
import { getOrCreateSessionId } from "@/lib/session";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const parsed = createLinkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
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

export async function GET() {
  const ownerId = await getOrCreateSessionId();

  const links = await prisma.link.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { clicks: true },
      },
    },
  });

  return NextResponse.json(links);
}