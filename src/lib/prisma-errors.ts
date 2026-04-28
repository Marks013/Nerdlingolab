export function isPrismaMissingTableError(error: unknown, modelName?: string): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { code?: unknown; meta?: { modelName?: unknown } };

  if (record.code !== "P2021") {
    return false;
  }

  return !modelName || record.meta?.modelName === modelName;
}
