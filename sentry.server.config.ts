import * as Sentry from "@sentry/nextjs";

// Sem SENTRY_DSN o SDK inicializa como no-op: nada é enviado e nada quebra,
// então dev/local/testes funcionam sem nenhuma configuração.
// Só captura de erro — tracing e replay ficam desligados de propósito.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0,
  sendDefaultPii: false,
});
