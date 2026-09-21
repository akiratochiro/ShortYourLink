import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
}

// Erros de Route Handlers e Server Components chegam aqui (ver docs do Next:
// instrumentation.js > onRequestError).
export const onRequestError = Sentry.captureRequestError;
