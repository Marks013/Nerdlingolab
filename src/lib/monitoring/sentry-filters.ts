interface SentryExceptionValue {
  stacktrace?: {
    frames?: Array<{
      filename?: string;
      function?: string;
      module?: string;
    }>;
  };
  type?: string;
  value?: string;
}

interface SentryBreadcrumb {
  category?: string;
  data?: unknown;
  message?: string;
}

interface SentryServerEvent {
  breadcrumbs?: SentryBreadcrumb[];
  exception?: {
    values?: SentryExceptionValue[];
  };
  message?: string;
}

export function shouldDropServerSentryEvent(event: SentryServerEvent): boolean {
  return isServerActionDeploymentSkew(event) || isClientAbortSentryEvent(event);
}

export function isClientAbortError(error: unknown): boolean {
  const text = collectErrorText(error).toLowerCase();

  return isClientAbortText(text);
}

function isServerActionDeploymentSkew(event: SentryServerEvent): boolean {
  return event.exception?.values?.some((exception) =>
    exception.value?.includes("Failed to find Server Action. This request might be from an older or newer deployment.")
  ) ?? false;
}

function isClientAbortSentryEvent(event: SentryServerEvent): boolean {
  const exceptionText = [
    event.message,
    ...(event.exception?.values?.map((exception) => [
      exception.type,
      exception.value,
      exception.stacktrace?.frames?.map((frame) => [
        frame.filename,
        frame.function,
        frame.module
      ].filter(Boolean).join(" "))
    ].flat().join(" ")) ?? []),
    ...(event.breadcrumbs?.map((breadcrumb) => [
      breadcrumb.category,
      breadcrumb.message,
      collectErrorText(breadcrumb.data)
    ].join(" ")) ?? [])
  ].join(" ").toLowerCase();

  return isClientAbortText(exceptionText);
}

function isClientAbortText(text: string): boolean {
  if (!text) {
    return false;
  }

  const hasAbortSignal = text.includes("econnreset")
    || text.includes("socket hang up")
    || text.includes("abortincoming")
    || text.includes("socketonclose")
    || text.includes("connection closed");

  return hasAbortSignal || /\baborted\b/.test(text);
}

function collectErrorText(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Error) {
    return [
      value.name,
      value.message,
      value.stack,
      collectErrorText((value as Error & { cause?: unknown }).cause)
    ].filter(Boolean).join(" ");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return [
      record.name,
      record.code,
      record.message,
      record.error,
      record.stack,
      record.cause
    ].map(collectErrorText).join(" ");
  }

  return String(value);
}
