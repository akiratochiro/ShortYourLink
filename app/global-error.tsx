"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-neutral-600">
          An unexpected error occurred. It has been reported.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-neutral-900 px-5 py-2 text-white"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
