"use client";

import { useState } from "react";
import { Check, Copy, ArrowRight } from "lucide-react";

type LinkResult = {
  slug: string;
  originalUrl: string;
};

export default function LinkForm() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<LinkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  function shortUrlFor(slug: string) {
    return `${window.location.origin}/${slug}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Algo deu errado. Tente novamente.");
        setResult(null);
        return;
      }

      setResult({ slug: data.slug, originalUrl: data.originalUrl });
      setCopied(false);
    } catch {
      setError("Não foi possível conectar ao servidor.");
      setResult(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(shortUrlFor(result.slug));
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
          placeholder="https://paste-your-long-link-here.com/..."
          className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-lightblue"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-darkblue px-6 py-3 font-medium text-white transition-colors hover:bg-lightblue focus:outline-none focus:ring-2 focus:ring-lightblue focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Encurtando..." : "Encurtar"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="motion-safe:animate-[collapse_0.4s_ease-out] rounded-lg border border-border bg-surface p-5">
          <p className="truncate font-mono text-xs text-muted line-through decoration-muted/50">
            {result.originalUrl}
          </p>
          <span aria-hidden className="my-2 flex items-center gap-1 font-mono text-xs text-muted">
            <ArrowRight size={12} strokeWidth={2.5} />
            comprimido em
          </span>
          <div className="flex items-center justify-between gap-3">
            <a
              href={shortUrlFor(result.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate rounded font-mono text-lg font-medium text-accent hover:underline focus:outline-none focus:ring-2 focus:ring-lightblue"
            >
              {shortUrlFor(result.slug).replace(/^https?:\/\//, "")}
            </a>
            <button
              onClick={handleCopy}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-darkblue transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-lightblue"
            >
              {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2.5} />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}