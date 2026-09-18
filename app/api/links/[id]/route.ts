import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionId } from "@/lib/session";

/**
 * Hard delete. A alternativa seria soft delete (`deletedAt` + filtro em
 * todo lugar que lê Link/Click), mas isso significa tocar cada ponto de
 * leitura existente — dashboard, GET /api/links, o redirect handler, a
 * checagem de unicidade de slug, e agora a agregação de clicks — todos
 * teriam que lembrar de excluir registros "soft-deletados", com o risco
 * de esquecer um. Hard delete reaproveita o `onDelete: Cascade` que já
 * existe entre Click e Link (prisma/schema.prisma) e não introduz nenhum
 * desses pontos de falha. Sem UI de "lixeira"/recuperação sendo pedida,
 * manter o histórico de clicks de um link apagado não tem uso — então
 * soft delete só adicionaria complexidade sem benefício exercitado.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ownerId = await getSessionId();

  // 404 uniforme (não 403) tanto para "não existe" quanto para "existe
  // mas não é seu" — devolver 403 para o segundo caso confirmaria a um
  // visitante que aquele id existe, permitindo enumerar ids de outras
  // sessões por tentativa e erro.
  const notFound = NextResponse.json(
    { error: "Link não encontrado." },
    { status: 404 }
  );

  if (!ownerId) {
    return notFound;
  }

  const link = await prisma.link.findUnique({
    where: { id },
    select: { ownerId: true },
  });

  if (!link || link.ownerId !== ownerId) {
    return notFound;
  }

  await prisma.link.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
