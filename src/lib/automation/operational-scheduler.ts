import { prisma } from "@/lib/prisma";

export type OperationalJobState = "failed" | "ran" | "skipped";

export interface OperationalJobResult {
  finishedAt: string;
  jobKey: string;
  reason?: string;
  result?: unknown;
  startedAt: string;
  state: OperationalJobState;
}

interface RunDueJobInput {
  force?: boolean;
  jobKey: string;
  minIntervalMs: number;
  run: () => Promise<unknown>;
}

interface JobRunRow {
  lastFinishedAt: Date | null;
  lastStartedAt: Date | null;
  lastStatus: string | null;
}

let setupPromise: Promise<void> | null = null;

export async function runDueOperationalJob(input: RunDueJobInput): Promise<OperationalJobResult> {
  await ensureOperationalJobRunTable();

  const now = new Date();
  const startedAt = now.toISOString();
  const row = await getOrCreateJobRun(input.jobKey);
  const lastReference = row.lastFinishedAt ?? row.lastStartedAt;

  if (!input.force && input.minIntervalMs > 0 && lastReference) {
    const nextRunAt = new Date(lastReference.getTime() + input.minIntervalMs);

    if (nextRunAt > now) {
      return {
        finishedAt: startedAt,
        jobKey: input.jobKey,
        reason: `Proxima execucao permitida em ${nextRunAt.toISOString()}`,
        startedAt,
        state: "skipped"
      };
    }
  }

  await prisma.$executeRawUnsafe(
    'UPDATE "OperationalJobRun" SET "lastStartedAt" = now(), "lastStatus" = $2, "updatedAt" = now() WHERE "jobKey" = $1',
    input.jobKey,
    "RUNNING"
  );

  try {
    const result = await input.run();
    const finishedAt = new Date().toISOString();

    await prisma.$executeRawUnsafe(
      'UPDATE "OperationalJobRun" SET "lastFinishedAt" = now(), "lastStatus" = $2, "lastResult" = $3::jsonb, "updatedAt" = now() WHERE "jobKey" = $1',
      input.jobKey,
      "OK",
      toJsonPayload(result)
    );

    return {
      finishedAt,
      jobKey: input.jobKey,
      result,
      startedAt,
      state: "ran"
    };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const safeError = error instanceof Error ? error.message : "Falha desconhecida";

    await prisma.$executeRawUnsafe(
      'UPDATE "OperationalJobRun" SET "lastFinishedAt" = now(), "lastStatus" = $2, "lastResult" = $3::jsonb, "updatedAt" = now() WHERE "jobKey" = $1',
      input.jobKey,
      "FAILED",
      toJsonPayload({ error: safeError })
    );

    return {
      finishedAt,
      jobKey: input.jobKey,
      reason: safeError,
      startedAt,
      state: "failed"
    };
  }
}

async function ensureOperationalJobRunTable(): Promise<void> {
  setupPromise ??= prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OperationalJobRun" (
      "jobKey" TEXT PRIMARY KEY,
      "lastStartedAt" TIMESTAMPTZ,
      "lastFinishedAt" TIMESTAMPTZ,
      "lastStatus" TEXT,
      "lastResult" JSONB,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `).then(() => undefined);

  return setupPromise;
}

async function getOrCreateJobRun(jobKey: string): Promise<JobRunRow> {
  await prisma.$executeRawUnsafe(
    'INSERT INTO "OperationalJobRun" ("jobKey", "updatedAt") VALUES ($1, now()) ON CONFLICT ("jobKey") DO NOTHING',
    jobKey
  );

  const rows = await prisma.$queryRawUnsafe<JobRunRow[]>(
    'SELECT "lastStartedAt", "lastFinishedAt", "lastStatus" FROM "OperationalJobRun" WHERE "jobKey" = $1 LIMIT 1',
    jobKey
  );

  return rows[0] ?? { lastFinishedAt: null, lastStartedAt: null, lastStatus: null };
}

function toJsonPayload(value: unknown): string {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return JSON.stringify({ error: "Resultado nao serializavel." });
  }
}
