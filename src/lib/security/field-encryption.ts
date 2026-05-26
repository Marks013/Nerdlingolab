import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ENCRYPTION_PREFIX = "enc:v1:";
const DETERMINISTIC_PREFIX = "enc:v1d:";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export class FieldEncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FieldEncryptionError";
  }
}

export function isEncryptedValue(value: unknown): value is string {
  return typeof value === "string" && (value.startsWith(ENCRYPTION_PREFIX) || value.startsWith(DETERMINISTIC_PREFIX));
}

export function encryptString(value: string | null | undefined, aad = "field"): string | null {
  const normalized = normalizeNullableString(value);

  if (normalized === null) {
    return null;
  }

  if (isEncryptedValue(normalized)) {
    return normalized;
  }

  return encryptRaw(normalized, aad, randomBytes(IV_LENGTH), ENCRYPTION_PREFIX);
}

export function encryptStringDeterministic(value: string | null | undefined, aad = "field"): string | null {
  const normalized = normalizeNullableString(value);

  if (normalized === null) {
    return null;
  }

  if (isEncryptedValue(normalized)) {
    return normalized;
  }

  const key = getFieldEncryptionKey();
  const iv = createHmac("sha256", key).update(aad).update("\0").update(normalized).digest().subarray(0, IV_LENGTH);

  return encryptRaw(normalized, aad, iv, DETERMINISTIC_PREFIX);
}

export function decryptString(value: string | null | undefined, aad = "field"): string | null {
  if (value === null || value === undefined || value === "") {
    return value ?? null;
  }

  if (!isEncryptedValue(value)) {
    return value;
  }

  const prefix = value.startsWith(DETERMINISTIC_PREFIX) ? DETERMINISTIC_PREFIX : ENCRYPTION_PREFIX;
  const payload = Buffer.from(value.slice(prefix.length), "base64url");

  if (payload.length <= IV_LENGTH + TAG_LENGTH) {
    throw new FieldEncryptionError("Encrypted payload is malformed.");
  }

  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, getFieldEncryptionKey(), iv);
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function encryptJson<T>(value: T, aad = "json"): string {
  return encryptString(JSON.stringify(value ?? null), aad) ?? encryptString("null", aad)!;
}

export function decryptJson<T>(value: unknown, aad = "json", fallback: T): T {
  if (typeof value !== "string" || !isEncryptedValue(value)) {
    return (value ?? fallback) as T;
  }

  try {
    return JSON.parse(decryptString(value, aad) ?? "null") as T;
  } catch (error) {
    throw new FieldEncryptionError(error instanceof Error ? error.message : "Could not decrypt JSON payload.");
  }
}

export function assertFieldEncryptionConfigured(): void {
  getFieldEncryptionKey();
}

export function getEncryptedLookupValues(values: readonly string[], aad: string): string[] {
  const result = new Set<string>();

  for (const value of values) {
    const normalized = normalizeNullableString(value);
    if (!normalized) continue;
    result.add(normalized);
    result.add(encryptStringDeterministic(normalized, aad)!);
  }

  return Array.from(result);
}

function encryptRaw(value: string, aad: string, iv: Buffer, prefix: string): string {
  const cipher = createCipheriv(ALGORITHM, getFieldEncryptionKey(), iv);
  cipher.setAAD(Buffer.from(aad));
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${prefix}${Buffer.concat([iv, tag, encrypted]).toString("base64url")}`;
}

function getFieldEncryptionKey(): Buffer {
  const rawKey = process.env.DATA_ENCRYPTION_KEY ?? process.env.FIELD_ENCRYPTION_KEY;

  if (!rawKey) {
    throw new FieldEncryptionError("DATA_ENCRYPTION_KEY is required for sensitive field encryption.");
  }

  const decoded = tryDecodeBase64(rawKey);
  if (decoded?.length === 32) {
    return decoded;
  }

  if (rawKey.length >= 32) {
    return createHash("sha256").update(rawKey).digest();
  }

  throw new FieldEncryptionError("DATA_ENCRYPTION_KEY must be at least 32 characters or a 32-byte base64 value.");
}

function tryDecodeBase64(value: string): Buffer | null {
  try {
    const normalized = value.trim();
    const decoded = Buffer.from(normalized, "base64");
    if (decoded.length === 0) return null;
    const reencoded = decoded.toString("base64").replace(/=+$/u, "");
    const input = normalized.replace(/=+$/u, "");
    if (timingSafeEqual(Buffer.from(reencoded), Buffer.from(input))) {
      return decoded;
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeNullableString(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value);
  return normalized.length > 0 ? normalized : null;
}
