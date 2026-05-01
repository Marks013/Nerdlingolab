import { createHmac, timingSafeEqual } from "node:crypto";

interface MercadoPagoSignatureParts {
  timestamp: string;
  signature: string;
}

function parseSignatureHeader(headerValue: string | null): MercadoPagoSignatureParts | null {
  if (!headerValue) {
    return null;
  }

  const parts = new Map(
    headerValue.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key?.trim(), value?.trim()];
    })
  );
  const timestamp = parts.get("ts");
  const signature = parts.get("v1");

  return timestamp && signature ? { timestamp, signature } : null;
}

function getManifestDataId(request: Request, payload: unknown): string | null {
  const url = new URL(request.url);
  const queryDataId = url.searchParams.get("data.id");

  if (queryDataId) {
    return queryDataId.toLowerCase();
  }

  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const data = typeof record.data === "object" && record.data !== null
    ? (record.data as Record<string, unknown>)
    : null;
  const dataId = data?.id ?? record["data.id"] ?? record.id;

  return typeof dataId === "string" || typeof dataId === "number"
    ? String(dataId).toLowerCase()
    : null;
}

export function verifyMercadoPagoWebhookSignature(request: Request, payload: unknown): boolean {
  const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return process.env.MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS === "true";
  }

  const signatureParts = parseSignatureHeader(request.headers.get("x-signature"));
  const requestId = request.headers.get("x-request-id");
  const dataId = getManifestDataId(request, payload);

  if (!signatureParts || !requestId || !dataId) {
    return false;
  }

  const manifest = `id:${dataId};request-id:${requestId};ts:${signatureParts.timestamp};`;
  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(manifest)
    .digest("hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(signatureParts.signature, "hex");

  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}
