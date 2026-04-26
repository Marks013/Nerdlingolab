"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { customerAddressFormSchema } from "@/lib/addresses/schema";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createCustomerAddress(formData: FormData): Promise<void> {
  const userId = await requireCurrentUserId();
  const parsedAddress = customerAddressFormSchema.safeParse({
    label: formData.get("label"),
    recipient: formData.get("recipient"),
    postalCode: formData.get("postalCode"),
    street: formData.get("street"),
    number: formData.get("number"),
    complement: formData.get("complement"),
    district: formData.get("district"),
    city: formData.get("city"),
    state: formData.get("state"),
    country: "BR",
    isDefault: formData.get("isDefault") === "true"
  });

  if (!parsedAddress.success) {
    throw new Error("Revise o endereço informado.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const addressCount = await tx.customerAddress.count({ where: { userId } });
      const shouldBeDefault = Boolean(parsedAddress.data.isDefault) || addressCount === 0;

      if (shouldBeDefault) {
        await tx.customerAddress.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false }
        });
      }

      await tx.customerAddress.create({
        data: {
          userId,
          label: parsedAddress.data.label || null,
          recipient: parsedAddress.data.recipient,
          postalCode: parsedAddress.data.postalCode,
          street: parsedAddress.data.street,
          number: parsedAddress.data.number,
          complement: parsedAddress.data.complement || null,
          district: parsedAddress.data.district,
          city: parsedAddress.data.city,
          state: parsedAddress.data.state,
          country: parsedAddress.data.country,
          isDefault: shouldBeDefault
        }
      });
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível salvar o endereço.");
  }

  revalidateAddressPaths();
  redirect(`/conta?endereco=${encodeURIComponent(parsedAddress.data.label || parsedAddress.data.recipient)}`);
}

export async function setDefaultCustomerAddress(addressId: string): Promise<void> {
  const userId = await requireCurrentUserId();

  try {
    await prisma.$transaction(async (tx) => {
      const address = await tx.customerAddress.findFirst({
        where: { id: addressId, userId },
        select: { id: true }
      });

      if (!address) {
        throw new Error("Endereço não encontrado.");
      }

      await tx.customerAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
      await tx.customerAddress.update({
        where: { id: address.id },
        data: { isDefault: true }
      });
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível atualizar o endereço padrão.");
  }

  revalidateAddressPaths();
  redirect("/conta");
}

export async function deleteCustomerAddress(addressId: string): Promise<void> {
  const userId = await requireCurrentUserId();

  try {
    await prisma.$transaction(async (tx) => {
      const address = await tx.customerAddress.findFirst({
        where: { id: addressId, userId },
        select: { id: true, isDefault: true }
      });

      if (!address) {
        return;
      }

      await tx.customerAddress.delete({ where: { id: address.id } });

      if (address.isDefault) {
        const nextAddress = await tx.customerAddress.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
          select: { id: true }
        });

        if (nextAddress) {
          await tx.customerAddress.update({
            where: { id: nextAddress.id },
            data: { isDefault: true }
          });
        }
      }
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível remover o endereço.");
  }

  revalidateAddressPaths();
  redirect("/conta");
}

async function requireCurrentUserId(): Promise<string> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  return session.user.id;
}

function revalidateAddressPaths(): void {
  revalidatePath("/conta");
  revalidatePath("/checkout");
}
