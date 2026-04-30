import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.02 : 0,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: process.env.NEXT_PUBLIC_SENTRY_ENABLE_LOGS === "true",
  integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
  beforeSend(event) {
    if (event.request?.cookies) {
      delete event.request.cookies;
    }

    return event;
  }
});
