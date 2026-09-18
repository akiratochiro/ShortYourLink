"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Copy, Trash2 } from "lucide-react";
import Sparkline from "./Sparkline";

type LinkWithCount = {
  id: string;
  slug: string;
  originalUrl: string;
  createdAt: Date;
  _count: { clicks: number };
};

type DailyClickCount = { date: string; count: number };

type LinkListProps = {
  links: LinkWithCount[];
  clickStats: Record<string, DailyClickCount[]>;
  nextCursor: string | null;
  prevCursor: string | null;
};

const DELETE_CONFIRM_TIMEOUT_MS = 4000;

function pageHref(cursor: string, direction: "next" | "prev") {
  const params = new URLSearchParams({ cursor, direction });
  return `/dashboard?${params.toString()}`;
}

export default function LinkList({ links, clickStats, nextCursor, prevCursor }: LinkListProps) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleCopy(id: string, slug: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/${slug}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function handleDeleteClick(id: string) {
    if (pendingDeleteId === id) {
      void confirmDelete(id);
      return;
    }

    setDeleteError(null);
    setPendingDeleteId(id);
    setTimeout(() => {
      setPendingDeleteId((current) => (current === id ? null : current));
    }, DELETE_CONFIRM_TIMEOUT_MS);
  }

  async function confirmDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/links/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setDeleteError(data?.error ?? "Não foi possível excluir o link.");
        return;
      }

      router.refresh();
    } catch {
      setDeleteError("Não foi possível conectar ao servidor.");
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
    }
  }

  return (
    <div>
      {deleteError && (
        <p className="mb-3 text-sm text-red-600" role="alert">
          {deleteError}
        </p>
      )}

      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <a
                  href={`/${link.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded font-mono text-base font-medium text-accent hover:underline focus:outline-none focus:ring-2 focus:ring-lightblue"
                >
                  {`${typeof window !== "undefined" ? window.location.host : ""}/${link.slug}`}
                </a>
                <p className="mt-1 truncate font-mono text-xs text-muted">
                  {link.originalUrl}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <Sparkline data={clickStats[link.id] ?? []} />

                <div className="text-right">
                  <span className="block text-lg font-semibold text-darkblue">
                    {link._count.clicks}
                  </span>
                  <span className="block text-xs text-muted">
                    {link._count.clicks === 1 ? "clique" : "cliques"}
                  </span>
                </div>

                <button
                  onClick={() => handleCopy(link.id, link.slug)}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-darkblue transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-lightblue"
                >
                  {copiedId === link.id ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2.5} />}
                  {copiedId === link.id ? "Copiado" : "Copiar"}
                </button>

                <button
                  onClick={() => handleDeleteClick(link.id)}
                  disabled={deletingId === link.id}
                  aria-label={pendingDeleteId === link.id ? "Confirmar exclusão" : "Excluir link"}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-lightblue disabled:cursor-not-allowed disabled:opacity-60 ${
                    pendingDeleteId === link.id
                      ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
                      : "border-border text-darkblue hover:bg-background"
                  }`}
                >
                  <Trash2 size={14} strokeWidth={2.5} />
                  {deletingId === link.id
                    ? "Excluindo..."
                    : pendingDeleteId === link.id
                      ? "Confirmar?"
                      : "Excluir"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {(prevCursor || nextCursor) && (
        <div className="mt-6 flex items-center justify-between">
          {prevCursor ? (
            <Link
              href={pageHref(prevCursor, "prev")}
              className="rounded font-medium text-lightblue hover:underline focus:outline-none focus:ring-2 focus:ring-lightblue"
            >
              ← Anterior
            </Link>
          ) : (
            <span className="text-muted">← Anterior</span>
          )}

          {nextCursor ? (
            <Link
              href={pageHref(nextCursor, "next")}
              className="rounded font-medium text-lightblue hover:underline focus:outline-none focus:ring-2 focus:ring-lightblue"
            >
              Próxima →
            </Link>
          ) : (
            <span className="text-muted">Próxima →</span>
          )}
        </div>
      )}
    </div>
  );
}
