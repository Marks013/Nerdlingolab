"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { customerProfileSchema } from "@/lib/account/profile-schema";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateCustomerProfile(formData: FormData): Promise<void> {
  const userId = await requireCurrentUserId();
  const parsedProfile = customerProfileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    cpf: formData.get("cpf"),
    birthday: formData.get("birthday")
  });

  if (!parsedProfile.success) {
    throw new Error("Revise os dados pessoais informados.");
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: parsedProfile.data.name,
        phone: parsedProfile.data.phone,
        cpf: parsedProfile.data.cpf,
        birthday: parsedProfile.data.birthday ? new Date(`${parsedProfile.data.birthday}T00:00:00.000Z`) : null
      }
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível salvar seus dados pessoais.");
  }

  revalidatePath("/conta");
  revalidatePath("/checkout");
  redirect("/conta");
}

async function requireCurrentUserId(): Promise<string> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  return session.user.id;
}
