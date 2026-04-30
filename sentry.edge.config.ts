import * as Sentry from "@sentry/nextjs";

const tracesSampleRate = process.env.NODE_ENV === "production" ? 0.05 : 1.0;

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate,
  enableLogs: process.env.SENTRY_ENABLE_LOGS === "true"
});
