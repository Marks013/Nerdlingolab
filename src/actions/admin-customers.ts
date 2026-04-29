"use server";

import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { UserRole } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email/transactional";
import { createPasswordResetTokenForUserId, getRequestBaseUrl } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

const customerActionSchema = z.object({
  customerId: z.string().trim().min(8).max(80)
});

const customerNotesSchema = customerActionSchema.extend({
  adminNotes: z.string().trim().max(2000)
});

function readCustomerId(formData: FormData): string {
  const parsedAction = customerActionSchema.safeParse({
    customerId: formData.get("customerId")
  });

  if (!parsedAction.success) {
    throw new Error("Cliente inválido.");
  }

  return parsedAction.data.customerId;
}

export async function anonymizeCustomerAccount(formData: FormData): Promise<void> {
  await requireAdmin();

  const session = await auth();
  const customerId = readCustomerId(formData);

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

export async function sendCustomerPasswordReset(formData: FormData): Promise<void> {
  await requireAdmin();

  const customerId = readCustomerId(formData);

  try {
    const resetToken = await createPasswordResetTokenForUserId(customerId);

    if (resetToken) {
      await sendPasswordResetEmail(resetToken, getRequestBaseUrl(await headers()));
    }
  } catch (error) {
    Sentry.captureException(error, {
      extra: { customerId },
      tags: {
        feature: "admin-customers",
        operation: "send-password-reset"
      }
    });

    throw new Error("Não foi possível enviar a redefinição de senha.");
  }

  revalidatePath("/admin/clientes");
  redirect("/admin/clientes?reset=sent");
}

export async function updateCustomerAdminNotes(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsedNotes = customerNotesSchema.safeParse({
    adminNotes: formData.get("adminNotes"),
    customerId: formData.get("customerId")
  });

  if (!parsedNotes.success) {
    throw new Error("Revise as observacoes do cliente.");
  }

  try {
    await prisma.user.update({
      data: {
        adminNotes: parsedNotes.data.adminNotes || null
      },
      where: { id: parsedNotes.data.customerId }
    });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { customerId: parsedNotes.data.customerId },
      tags: {
        feature: "admin-customers",
        operation: "update-notes"
      }
    });

    throw new Error("Nao foi possivel salvar as observacoes.");
  }

  revalidatePath("/admin/clientes");
  redirect("/admin/clientes?notes=saved");
}
