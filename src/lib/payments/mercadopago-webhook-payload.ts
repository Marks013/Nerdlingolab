import type { Prisma } from "@/generated/prisma/client";

export function getMercadoPagoPaymentId(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  const data = isRecord(payload.data) ? payload.data : null;
  const candidate = data?.id ?? payload["data.id"] ?? payload.id;

  return stringifyIdentifier(candidate);
}

export function getMercadoPagoExternalEventId(payload: unknown): string {
  if (!isRecord(payload)) {
    return crypto.randomUUID();
  }

  const data = isRecord(payload.data) ? payload.data : null;
  const candidate = payload.id ?? payload["data.id"] ?? data?.id;

  return stringifyIdentifier(candidate) ?? crypto.randomUUID();
}

export function toJsonValue(payload: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
}

function stringifyIdentifier(value: unknown): string | null {
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
