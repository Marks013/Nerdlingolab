"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { customerProfileSchema } from "@/lib/account/profile-schema";
import { auth } from "@/lib/auth";
import { getCpfLookupValues, parseBirthdayInput } from "@/lib/identity/brazil";
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
    const cpfOwner = await prisma.user.findFirst({
      where: {
        cpf: { in: getCpfLookupValues(parsedProfile.data.cpf) },
        NOT: { id: userId }
      },
      select: { id: true }
    });

    if (cpfOwner) {
      throw new Error("CPF já vinculado a outra conta.");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: parsedProfile.data.name,
        phone: parsedProfile.data.phone,
        cpf: parsedProfile.data.cpf,
        birthday: parseBirthdayInput(parsedProfile.data.birthday)
      }
    });
  } catch (error) {
    Sentry.captureException(error);
    if (error instanceof Error && error.message === "CPF já vinculado a outra conta.") {
      throw error;
    }
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
