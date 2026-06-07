import { createHash, timingSafeEqual } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import {
  ProductStatus,
  SupplierAlertSeverity,
  SupplierAlertStatus,
  SupplierAlertType,
  SupplierSourceStatus
} from "@/generated/prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { rateLimitRequest } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const staleProcessingMinutes = 30;
const oldBackupHours = 30;
const operationalSupplierAlertTypes = [
  SupplierAlertType.API_ERROR,
  SupplierAlertType.CONFIG_REQUIRED,
  SupplierAlertType.LINK_INVALID,
  SupplierAlertType.OUT_OF_STOCK,
  SupplierAlertType.SOURCE_CLOSED,
  SupplierAlertType.SOURCE_DELETED,
  SupplierAlertType.SOURCE_PAUSED
];

type OpsState = "ok" | "degraded";

interface CountByStatus {
  status: string;
  count: number;
}

export async function GET(request: Request): Promise<NextResponse> {
  const rateLimitResponse = rateLimitRequest(request, {
    intervalMs: 60_000,
    limit: 60,
    name: "nerdlingolab-ops-status"
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authResult = authorizeOpsRequest(request);

  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const startedAt = Date.now();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - staleProcessingMinutes * 60_000);

  try {
    const [
      webhookStatuses,
      staleWebhooks,
      newsletterDeliveryStatuses,
      staleNewsletterDeliveries,
      newsletterCampaignStatuses,
      sourceAlertStatuses,
      actionableSourceAlerts,
      productSourceStatuses,
      actionableConfigRequiredSources,
      orderStatuses,
      paymentStatuses,
      shipmentStatuses,
      supportTicketStatuses,
      loyaltyNotificationStatuses,
      backupStatus,
      automationJobs
    ] = await Promise.all([
      countWebhookStatuses(),
      prisma.webhookEvent.count({
        where: {
          status: "PROCESSING",
          OR: [{ processingStartedAt: null }, { processingStartedAt: { lte: staleBefore } }]
        }
      }),
      countNewsletterDeliveryStatuses(),
      prisma.newsletterCampaignDelivery.count({
        where: {
          status: "PROCESSING",
          OR: [{ processingStartedAt: null }, { processingStartedAt: { lte: staleBefore } }]
        }
      }),
      prisma.newsletterCampaign.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.sourceAlert.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.sourceAlert.count({
        where: {
          severity: { in: [SupplierAlertSeverity.WARNING, SupplierAlertSeverity.CRITICAL] },
          status: SupplierAlertStatus.OPEN,
          type: { in: operationalSupplierAlertTypes },
          productSource: {
            product: {
              status: { not: ProductStatus.ARCHIVED }
            }
          }
        }
      }),
      prisma.productSource.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.productSource.count({
        where: {
          lastError: { not: null },
          status: SupplierSourceStatus.CONFIG_REQUIRED,
          product: {
            status: { not: ProductStatus.ARCHIVED }
          }
        }
      }),
      prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.order.groupBy({ by: ["paymentStatus"], _count: { _all: true } }),
      prisma.shipment.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.supportTicket.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.loyaltyNotification.groupBy({ by: ["status"], _count: { _all: true } }),
      readBackupStatus(now),
      getAutomationJobs()
    ]);

    const sourceSignals = buildSourceSignals({
      actionableConfigRequiredSources,
      actionableSourceAlerts,
      productSources: normalizeCounts(productSourceStatuses)
    });
    const incidents = [
      ...buildQueueWarnings("billingWebhooks", webhookStatuses, staleWebhooks),
      ...buildQueueWarnings("newsletterDeliveries", newsletterDeliveryStatuses, staleNewsletterDeliveries),
      ...sourceSignals.incidents,
      ...buildBackupWarnings(backupStatus, now)
    ];
    const businessWarnings = sourceSignals.businessWarnings;
    const warnings = [...incidents, ...businessWarnings];

    const state: OpsState = incidents.length > 0 ? "degraded" : "ok";

    return NextResponse.json({
      status: state,
      service: "nerdlingolab-ops",
      timestamp: now.toISOString(),
      latencyMs: Date.now() - startedAt,
      health: {
        database: { status: "ok" },
        backup: backupStatus
      },
      automationJobs,
      queues: {
        billingWebhooks: {
          statuses: webhookStatuses,
          staleProcessing: staleWebhooks
        },
        newsletterDeliveries: {
          statuses: newsletterDeliveryStatuses,
          staleProcessing: staleNewsletterDeliveries
        }
      },
      commerce: {
        newsletterCampaigns: normalizeCounts(newsletterCampaignStatuses),
        actionableSourceAlerts,
        actionableConfigRequiredSources,
        sourceAlerts: normalizeCounts(sourceAlertStatuses),
        productSources: normalizeCounts(productSourceStatuses),
        orders: normalizeCounts(orderStatuses),
        payments: paymentStatuses.map((item: { _count: { _all: number }; paymentStatus: unknown }) => ({
          count: item._count._all,
          status: item.paymentStatus
        })),
        shipments: normalizeCounts(shipmentStatuses),
        supportTickets: normalizeCounts(supportTicketStatuses),
        loyaltyNotifications: normalizeCounts(loyaltyNotificationStatuses)
      },
      incidents,
      businessWarnings,
      warnings
    });
  } catch (error) {
    console.error("nerdlingolab-ops-status failed", error);
    return NextResponse.json(
      {
        status: "degraded",
        service: "nerdlingolab-ops",
        timestamp: now.toISOString(),
        latencyMs: Date.now() - startedAt,
        error: "Falha ao montar status operacional."
      },
      { status: 500 }
    );
  }
}

function authorizeOpsRequest(request: Request): { error?: string; ok: boolean; status: number } {
  const expectedSecrets = [env.NERDLINGOLAB_AUTOMATION_SECRET].filter((value): value is string => Boolean(value));

  if (expectedSecrets.length === 0) {
    return { error: "Secret de automacao dedicado nao configurado.", ok: false, status: 503 };
  }

  const header = request.headers.get("authorization") ?? "";
  const bearerToken = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";

  if (!expectedSecrets.some((secret) => safeTokenEquals(bearerToken, secret))) {
    return { error: "Nao autorizado.", ok: false, status: 401 };
  }

  return { ok: true, status: 200 };
}

function safeTokenEquals(receivedToken: string, expectedToken: string): boolean {
  if (!receivedToken || !expectedToken) {
    return false;
  }

  const received = Buffer.from(createHash("sha256").update(receivedToken).digest("hex"));
  const expected = Buffer.from(createHash("sha256").update(expectedToken).digest("hex"));
  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function countWebhookStatuses(): Promise<CountByStatus[]> {
  const rows = await prisma.webhookEvent.groupBy({ by: ["status"], _count: { _all: true } });
  return rows.map((row) => ({ count: row._count._all, status: row.status }));
}

async function countNewsletterDeliveryStatuses(): Promise<CountByStatus[]> {
  const rows = await prisma.newsletterCampaignDelivery.groupBy({ by: ["status"], _count: { _all: true } });
  return rows.map((row) => ({ count: row._count._all, status: row.status }));
}


async function getAutomationJobs(): Promise<
  Array<{
    jobKey: string;
    lastFinishedAt: string | null;
    lastStartedAt: string | null;
    lastStatus: string | null;
    updatedAt: string | null;
  }>
> {
  try {
    const exists = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      'SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1) AS exists',
      "OperationalJobRun"
    );

    if (!exists[0]?.exists) {
      return [];
    }

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        jobKey: string;
        lastFinishedAt: Date | null;
        lastStartedAt: Date | null;
        lastStatus: string | null;
        updatedAt: Date | null;
      }>
    >(
      'SELECT "jobKey", "lastStartedAt", "lastFinishedAt", "lastStatus", "updatedAt" FROM "OperationalJobRun" ORDER BY "jobKey" ASC'
    );

    return rows.map((row) => ({
      jobKey: row.jobKey,
      lastFinishedAt: row.lastFinishedAt?.toISOString() ?? null,
      lastStartedAt: row.lastStartedAt?.toISOString() ?? null,
      lastStatus: row.lastStatus,
      updatedAt: row.updatedAt?.toISOString() ?? null
    }));
  } catch {
    return [];
  }
}

function normalizeCounts(rows: Array<{ _count: { _all: number }; status: unknown }>): CountByStatus[] {
  return rows.map((row) => ({ count: row._count._all, status: String(row.status) }));
}

function buildQueueWarnings(label: string, statuses: CountByStatus[], staleProcessing: number): string[] {
  const warnings: string[] = [];
  const failed = countStatus(statuses, "FAILED");
  const deadLetter = countStatus(statuses, "DEAD_LETTER");

  if (failed > 0) {
    warnings.push(`${label}: ${failed} itens com falha`);
  }

  if (deadLetter > 0) {
    warnings.push(`${label}: ${deadLetter} itens em dead letter`);
  }

  if (staleProcessing > 0) {
    warnings.push(`${label}: ${staleProcessing} itens presos em processamento`);
  }

  return warnings;
}

function buildSourceSignals(input: {
  actionableConfigRequiredSources: number;
  actionableSourceAlerts: number;
  productSources: CountByStatus[];
}): { businessWarnings: string[]; incidents: string[] } {
  const businessWarnings: string[] = [];
  const incidents: string[] = [];
  const sourceErrors = countStatus(input.productSources, SupplierSourceStatus.ERROR);

  if (sourceErrors > 0) {
    incidents.push(`dropshipping: ${sourceErrors} origens com erro`);
  }

  if (input.actionableSourceAlerts > 0) {
    businessWarnings.push(`dropshipping: ${input.actionableSourceAlerts} alertas acionaveis de fornecedor`);
  }

  if (input.actionableConfigRequiredSources > 0) {
    businessWarnings.push(`dropshipping: ${input.actionableConfigRequiredSources} origens pendentes de configuracao`);
  }

  return { businessWarnings, incidents };
}

function buildBackupWarnings(status: Awaited<ReturnType<typeof readBackupStatus>>, now: Date): string[] {
  const warnings: string[] = [];

  if (status.status === "unknown") {
    warnings.push("backup: status indisponivel no container web");
    return warnings;
  }

  if (status.status === "failed") {
    warnings.push("backup: ultima execucao registrada como falha");
  }

  if (status.lastSuccessAt) {
    const ageHours = (now.getTime() - new Date(status.lastSuccessAt).getTime()) / 3_600_000;

    if (ageHours > oldBackupHours) {
      warnings.push(`backup: ultimo sucesso ha ${Math.floor(ageHours)}h`);
    }
  } else {
    warnings.push("backup: sem ultimo sucesso registrado");
  }

  return warnings;
}

function countStatus(statuses: CountByStatus[], status: string): number {
  return statuses.find((item) => item.status === status)?.count ?? 0;
}

async function readBackupStatus(now: Date) {
  const backupDir = env.BACKUP_STATUS_DIR;

  try {
    const [lastSuccess, lastFailure, lastSkipped] = await Promise.all([
      readMarker(join(backupDir, "last-success.txt")),
      readMarker(join(backupDir, "last-failure.txt")),
      readMarker(join(backupDir, "last-skipped.txt"))
    ]);

    const lastSuccessAt = extractIsoDate(lastSuccess.content) ?? lastSuccess.modifiedAt;
    const lastFailureAt = extractIsoDate(lastFailure.content) ?? lastFailure.modifiedAt;
    const lastSkippedAt = extractIsoDate(lastSkipped.content) ?? lastSkipped.modifiedAt;
    const latestFailureIsNewer =
      lastFailureAt && (!lastSuccessAt || new Date(lastFailureAt).getTime() > new Date(lastSuccessAt).getTime());

    return {
      status: latestFailureIsNewer ? "failed" : lastSuccessAt ? "ok" : "unknown",
      checkedAt: now.toISOString(),
      lastSuccessAt,
      lastFailureAt,
      lastSkippedAt,
      lastSuccessPayloadHash: extractField(lastSuccess.content, "payload_hash"),
      lastBackupFile: sanitizeBackupPath(extractField(lastSuccess.content, "backup")),
      statusDirMounted: true
    };
  } catch {
    return {
      status: "unknown",
      checkedAt: now.toISOString(),
      lastSuccessAt: null,
      lastFailureAt: null,
      lastSkippedAt: null,
      statusDirMounted: false
    };
  }
}

async function readMarker(path: string): Promise<{ content: string; modifiedAt: string | null }> {
  try {
    const [content, metadata] = await Promise.all([readFile(path, "utf8"), stat(path)]);
    return { content, modifiedAt: metadata.mtime.toISOString() };
  } catch {
    return { content: "", modifiedAt: null };
  }
}

function extractField(content: string, field: string): string | null {
  const line = content
    .split(/\r?\n/)
    .find((item) => item.startsWith(`${field}=`));
  return line ? line.slice(field.length + 1).trim() || null : null;
}

function extractIsoDate(content: string): string | null {
  const match = content.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:?\d{2}|Z)?/);
  return match ? new Date(match[0]).toISOString() : null;
}

function sanitizeBackupPath(path: string | null): string | null {
  if (!path) {
    return null;
  }

  return path.split("/").slice(-4).join("/");
}
