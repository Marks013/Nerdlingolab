"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import { auth, signOut } from "@/lib/auth";
import { deleteCustomerAccountPermanently } from "@/lib/account/delete-account";
import { prisma } from "@/lib/prisma";

const customerDeleteSchema = z.object({
  customerId: z.string().trim().min(8).max(80),
  confirmDelete: z.string().trim()
});

export async function deleteCustomerAccountByAdmin(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = customerDeleteSchema.safeParse({
    confirmDelete: formData.get("confirmDelete"),
    customerId: formData.get("customerId")
  });

  if (!parsed.success || parsed.data.confirmDelete !== "EXCLUIR") {
    throw new Error("Confirme a exclusão digitando EXCLUIR.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await deleteCustomerAccountPermanently({
        actor: "admin",
        tx,
        userId: parsed.data.customerId
      });
    });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { customerId: parsed.success ? parsed.data.customerId : null },
      tags: { feature: "account-deletion", operation: "admin-delete" }
    });

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Não foi possível excluir a conta.");
  }

  revalidatePath("/admin/clientes");
  redirect("/admin/clientes?account=deleted");
}

export async function deleteOwnCustomerAccount(formData: FormData): Promise<void> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/entrar");
  }

  const confirmDelete = String(formData.get("confirmDelete") ?? "").trim();

  if (confirmDelete !== "EXCLUIR") {
    throw new Error("Confirme a exclusão digitando EXCLUIR.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await deleteCustomerAccountPermanently({
        actor: "self",
        tx,
        userId: session.user.id
      });
    });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { userId: session.user.id },
      tags: { feature: "account-deletion", operation: "self-delete" }
    });

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Não foi possível excluir sua conta.");
  }

  await signOut({ redirectTo: "/" });
}
