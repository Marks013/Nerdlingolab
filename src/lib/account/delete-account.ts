import { UserRole, type PrismaClient } from "@/generated/prisma/client";
import { decryptJson, encryptJson } from "@/lib/security/field-encryption";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

interface DeleteCustomerAccountInput {
  actor: "admin" | "self";
  tx: TransactionClient;
  userId: string;
}

export async function deleteCustomerAccountPermanently({
  actor,
  tx,
  userId
}: DeleteCustomerAccountInput): Promise<void> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      birthday: true,
      cpf: true,
      email: true,
      id: true,
      name: true,
      phone: true,
      role: true
    }
  });

  if (!user) {
    throw new Error("Conta não encontrada.");
  }

  if (user.role !== UserRole.CUSTOMER) {
    throw new Error("A exclusão definitiva automática está disponível apenas para contas de cliente.");
  }

  const orders = await tx.order.findMany({
    where: { userId },
    select: {
      customerSnapshot: true,
      id: true
    }
  });

  for (const order of orders) {
    const customerSnapshot = decryptJson(
      order.customerSnapshot,
      "order-customer-snapshot",
      toRecord(order.customerSnapshot)
    );

    await tx.order.update({
      where: { id: order.id },
      data: {
        customerSnapshot: encryptJson({
          ...toRecord(customerSnapshot),
          accountDeletedAt: new Date().toISOString(),
          accountDeletionActor: actor,
          originalUserId: user.id,
          preservedCustomer: {
            birthday: user.birthday?.toISOString() ?? null,
            cpf: user.cpf,
            email: user.email,
            name: user.name,
            phone: user.phone
          }
        }, "order-customer-snapshot"),
        userId: null
      }
    });
  }

  await tx.user.delete({
    where: { id: userId }
  });
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
