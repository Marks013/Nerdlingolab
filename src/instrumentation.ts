import * as Sentry from "@sentry/nextjs";

import { isClientAbortError } from "@/lib/monitoring/sentry-filters";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError: typeof Sentry.captureRequestError = (error, request, errorContext) => {
  if (isClientAbortError(error)) {
    return;
  }

  Sentry.captureRequestError(error, request, errorContext);
};
