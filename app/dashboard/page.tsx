import { getSessionId } from "@/lib/session";
import { getLinksPage } from "@/lib/links-pagination";
import { getDailyClickCountsForLinks, CLICK_STATS_DAYS } from "@/lib/click-stats";
import { linksQuerySchema } from "@/lib/validation";
import LinkList from "@/components/LinkList";
import Link from "next/link";
import { Link2 } from "lucide-react";

type DashboardPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const ownerId = await getSessionId();
  const rawQuery = await searchParams;

  const parsedQuery = linksQuerySchema.safeParse({
    cursor: typeof rawQuery.cursor === "string" ? rawQuery.cursor : undefined,
    direction: typeof rawQuery.direction === "string" ? rawQuery.direction : undefined,
  });
  const query = parsedQuery.success ? parsedQuery.data : {};
  const isPaginated = Boolean(query.cursor);

  const { links, nextCursor, prevCursor } = ownerId
    ? await getLinksPage({ ownerId, ...query })
    : { links: [], nextCursor: null, prevCursor: null };

  const clickStats = await getDailyClickCountsForLinks(
    links.map((link) => link.id),
    CLICK_STATS_DAYS
  );

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-sm uppercase tracking-widest text-muted">
              shortyourlink
            </span>
            <h1 className="mt-2 font-display text-3xl font-semibold text-darkblue">
              Seus links
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-darkblue transition-colors hover:bg-surface"
          >
            + Novo link
          </Link>
        </div>

        <div className="mt-10">
          {links.length === 0 && isPaginated ? (
            // Página sem resultados por causa do cursor (fim da lista, ou um
            // cursor que apontava para um link já excluído) — não é o mesmo
            // caso de "conta vazia", então não mostramos o CTA de onboarding.
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <p className="text-muted">Não há mais links por aqui.</p>
              <Link
                href="/dashboard"
                className="mt-4 inline-block rounded font-medium text-lightblue hover:underline focus:outline-none focus:ring-2 focus:ring-lightblue"
              >
                Voltar para o início
              </Link>
            </div>
          ) : links.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-darkblue/5 text-darkblue">
                <Link2 size={18} strokeWidth={2} />
              </div>
              <p className="mt-4 text-muted">
                Você ainda não criou nenhum link.
              </p>
              <Link
                href="/"
                className="mt-4 inline-block rounded font-medium text-lightblue hover:underline focus:outline-none focus:ring-2 focus:ring-lightblue"
              >
                Criar meu primeiro link
              </Link>
            </div>
          ) : (
            <LinkList
              links={links}
              clickStats={Object.fromEntries(clickStats)}
              nextCursor={nextCursor}
              prevCursor={prevCursor}
            />
          )}
        </div>
      </div>
    </main>
  );
}
