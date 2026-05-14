export function isPrismaMissingTableError(error: unknown, modelName?: string): boolean {
  const code = getPrismaErrorCode(error);

  if (code !== "P2021") {
    return false;
  }

  return !modelName || getPrismaErrorModelName(error) === modelName;
}

export function isPrismaSchemaDriftError(error: unknown, modelName?: string): boolean {
  const code = getPrismaErrorCode(error);

  if (code === "P2021") {
    return !modelName || getPrismaErrorModelName(error) === modelName;
  }

  if (code === "P2022") {
    return !modelName || getErrorMessage(error).includes(modelName);
  }

  const message = getErrorMessage(error);

  return (
    message.includes("does not exist") ||
    message.includes("column") && message.includes("not found") ||
    Boolean(modelName && message.includes(modelName))
  );
}

export function getPrismaErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const record = error as { code?: unknown };

  return typeof record.code === "string" ? record.code : null;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "";
}

function getPrismaErrorModelName(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const record = error as { meta?: { modelName?: unknown } };

  return typeof record.meta?.modelName === "string" ? record.meta.modelName : null;
}
