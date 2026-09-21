import * as Sentry from "@sentry/nextjs";

// NEXT_PUBLIC_* é inlinado no build; sem ele o SDK fica inerte no browser.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
