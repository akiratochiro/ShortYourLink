"use client";

import { useState } from "react";

// TEMPORÁRIO: gera um slug falso só para visualizar o layout.
// Será substituído por uma chamada real a POST /api/links quando
// implementarmos lib/slug.ts e a rota da API.
function generateMockSlug() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < 6; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}

export default function LinkForm() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<{ original: string; slug: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setResult({ original: url.trim(), slug: generateMockSlug() });
    setCopied(false);
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(`shortyourlink.com/${result.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="url" className="sr-only">
          Long URL
        </label>
        <input
          id="url"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://copie-seu-link-longo-aqui.com/..."
          className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-lightblue"
        />
        <button
          type="submit"
          className="rounded-lg bg-darkblue px-6 py-3 font-medium text-white transition-colors hover:bg-lightblue focus:outline-none focus:ring-2 focus:ring-lightblue focus:ring-offset-2 focus:ring-offset-background"
        >
          Encurtar
        </button>
      </form>

      {result && (
        <div className="motion-safe:animate-[collapse_0.4s_ease-out] rounded-lg border border-border bg-surface p-5">
          <p className="truncate font-mono text-xs text-muted line-through decoration-muted/50">
            {result.original}
          </p>
          <span aria-hidden className="my-2 block font-mono text-xs text-muted">
            → comprimido em
          </span>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-lg font-medium text-accent">
              shortyourlink.com/{result.slug}
            </span>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-darkblue transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-lightblue"
            >
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}