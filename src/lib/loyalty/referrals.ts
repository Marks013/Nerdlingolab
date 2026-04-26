import { ReferralStatus } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

const REFERRAL_CODE_PREFIX = "NERD";

type ReferralClient = Pick<typeof prisma, "referralCode" | "user">;

export function normalizeReferralCode(value: string | null | undefined): string | null {
  const code = value?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") ?? "";

  return code.length >= 6 && code.length <= 24 ? code : null;
}

export async function ensureReferralCode(userId: string, client: ReferralClient = prisma): Promise<string> {
  const existingCode = await client.referralCode.findUnique({
    where: { userId }
  });

  if (existingCode) {
    return existingCode.code;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = buildReferralCode();

    try {
      const referralCode = await client.referralCode.create({
        data: { code, userId }
      });

      return referralCode.code;
    } catch {
      continue;
    }
  }

  const fallbackUser = await client.user.findUnique({
    select: { id: true },
    where: { id: userId }
  });

  if (!fallbackUser) {
    throw new Error("Cliente não encontrado para gerar indicação.");
  }

  return `${REFERRAL_CODE_PREFIX}${fallbackUser.id.slice(-10).toUpperCase()}`;
}

export function buildReferralSignupUrl(appUrl: string, code: string): string {
  const url = new URL("/cadastro", appUrl);
  url.searchParams.set("ref", code);

  return url.toString();
}

export function getReferralStatusLabel(status: ReferralStatus): string {
  if (status === ReferralStatus.REWARDED) {
    return "Recompensada";
  }

  if (status === ReferralStatus.CANCELED) {
    return "Cancelada";
  }

  return "Pendente";
}

function buildReferralCode(): string {
  return `${REFERRAL_CODE_PREFIX}${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}
