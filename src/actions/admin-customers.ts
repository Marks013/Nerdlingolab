"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";

import { UserRole } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function anonymizeCustomerAccount(formData: FormData): Promise<void> {
  await requireAdmin();

  const session = await auth();
  const customerId = formData.get("customerId");

  if (typeof customerId !== "string" || customerId.length < 8) {
    throw new Error("Cliente inválido.");
  }

  if (session?.user?.id === customerId) {
    throw new Error("Você não pode remover a própria conta pelo painel de clientes.");
  }

  try {
    const customer = await prisma.user.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        role: true
      }
    });

    if (!customer) {
      throw new Error("Cliente não encontrado.");
    }

    if (customer.role !== UserRole.CUSTOMER) {
      throw new Error("Contas administrativas não podem ser removidas por esta ação.");
    }

    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: customerId } }),
      prisma.account.deleteMany({ where: { userId: customerId } }),
      prisma.customerAddress.deleteMany({ where: { userId: customerId } }),
      prisma.referralCode.updateMany({
        where: { userId: customerId },
        data: { isActive: false }
      }),
      prisma.loyaltyPoints.updateMany({
        where: { userId: customerId },
        data: { balance: 0 }
      }),
      prisma.user.update({
        where: { id: customerId },
        data: {
          birthday: null,
          cpf: null,
          email: `deleted+${customerId}@nerdlingolab.local`,
          emailVerified: null,
          image: null,
          name: "Cliente removido",
          passwordHash: null,
          phone: null
        }
      })
    ]);
  } catch (error) {
    Sentry.captureException(error, {
      extra: { customerId },
      tags: {
        feature: "admin-customers",
        operation: "anonymize"
      }
    });

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Não foi possível remover a conta do cliente.");
  }

  revalidatePath("/admin/clientes");
  revalidatePath("/admin/dashboard");
}
