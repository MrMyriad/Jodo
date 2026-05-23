import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  enabled:
    Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN) &&
    process.env.NODE_ENV === "production",
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
