import { prisma } from "./prisma";

/**
 * Paginação cursor-based (em vez de offset/skip) porque o dashboard lista
 * links por ordem de criação e novos links continuam sendo inseridos
 * enquanto alguém navega entre páginas — com offset, um insert entre duas
 * requisições desloca todo mundo em uma posição e duplica/pula itens na
 * página seguinte. Cursor ancora cada página num id real, então é imune
 * a isso.
 *
 * Compartilhado entre app/dashboard/page.tsx (Server Component, chama
 * Prisma direto) e GET /api/links (Route Handler), para que os dois
 * pontos de leitura fiquem sempre consistentes — ver README.md.
 */

export const LINKS_PAGE_SIZE = 10;

const ORDER_BY = [{ createdAt: "desc" as const }, { id: "desc" as const }];

export interface LinkWithClickCount {
  id: string;
  slug: string;
  originalUrl: string;
  createdAt: Date;
  _count: { clicks: number };
}

export interface LinksPage {
  links: LinkWithClickCount[];
  nextCursor: string | null;
  prevCursor: string | null;
}

export interface GetLinksPageParams {
  ownerId: string;
  cursor?: string;
  direction?: "next" | "prev";
}

export async function getLinksPage({
  ownerId,
  cursor,
  direction = "next",
}: GetLinksPageParams): Promise<LinksPage> {
  const isFirstPage = !cursor;
  const effectiveDirection = isFirstPage ? "next" : direction;
  const take =
    effectiveDirection === "prev"
      ? -(LINKS_PAGE_SIZE + 1)
      : LINKS_PAGE_SIZE + 1;

  const rows = await prisma.link.findMany({
    where: { ownerId },
    orderBy: ORDER_BY,
    include: { _count: { select: { clicks: true } } },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  // Buscamos uma linha a mais que o tamanho da página só para saber se há
  // mais conteúdo além dela; ela nunca é exibida. Independente da direção,
  // o Prisma sempre devolve as linhas na ordem de `orderBy` (createdAt
  // desc) — com `take` negativo ele busca "para trás" e reordena o
  // resultado antes de retornar, então a linha extra (quando existe) é a
  // mais antiga do lote "prev" (primeira do array) ou a mais recente do
  // lote "next" (última do array).
  const hasExtra = rows.length > LINKS_PAGE_SIZE;
  const page =
    effectiveDirection === "prev" && hasExtra
      ? rows.slice(1)
      : rows.slice(0, LINKS_PAGE_SIZE);

  let hasNext: boolean;
  let hasPrev: boolean;

  if (isFirstPage) {
    hasNext = hasExtra;
    hasPrev = false;
  } else if (effectiveDirection === "next") {
    hasNext = hasExtra;
    hasPrev = true; // veio de algum lugar — sempre existe página anterior
  } else {
    hasNext = true; // idem, na direção contrária
    hasPrev = hasExtra;
  }

  return {
    links: page,
    nextCursor: hasNext && page.length > 0 ? page[page.length - 1].id : null,
    prevCursor: hasPrev && page.length > 0 ? page[0].id : null,
  };
}
