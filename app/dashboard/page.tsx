import { prisma } from "@/lib/prisma";
import { getSessionId } from "@/lib/session";
import LinkList from "@/components/LinkList";
import Link from "next/link";

export default async function DashboardPage() {
  const ownerId = await getSessionId();

  const links = ownerId
    ? await prisma.link.findMany({
        where: { ownerId },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { clicks: true },
          },
        },
      })
    : [];

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
          {links.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <p className="text-muted">
                Você ainda não criou nenhum link.
              </p>
              <Link
                href="/"
                className="mt-4 inline-block font-medium text-lightblue hover:underline"
              >
                Criar meu primeiro link
              </Link>
            </div>
          ) : (
            <LinkList links={links} />
          )}
        </div>
      </div>
    </main>
  );
}