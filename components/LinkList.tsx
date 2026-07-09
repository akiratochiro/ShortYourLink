"use client";

import { useState } from "react";

type LinkWithCount = {
  id: string;
  slug: string;
  originalUrl: string;
  createdAt: Date;
  _count: { clicks: number };
};

export default function LinkList({ links }: { links: LinkWithCount[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopy(id: string, slug: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/${slug}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <ul className="space-y-3">
      {links.map((link) => (
        <li
          key={link.id}
          className="rounded-lg border border-border bg-surface p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <a
                href={`/${link.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-base font-medium text-accent hover:underline"
              >
                {`${typeof window !== "undefined" ? window.location.host : ""}/${link.slug}`}
              </a>
              <p className="mt-1 truncate font-mono text-xs text-muted">
                {link.originalUrl}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
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
                className="rounded-md border border-border px-3 py-1.5 text-sm text-darkblue transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-lightblue"
              >
                {copiedId === link.id ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}