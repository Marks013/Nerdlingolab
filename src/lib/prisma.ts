import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { decryptJson, decryptString } from "@/lib/security/field-encryption";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://nerdlingolab:nerdlingolab_dev_password@localhost:5432/nerdlingolab";
const adapter = new PrismaPg({
  connectionString: databaseUrl
});

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.DEBUG_PRISMA_QUERIES === "true" ? ["query", "error", "warn"] : ["error"]
  });

export const prisma: PrismaClient = basePrisma.$extends({
  result: {
    customerAddress: {
      city: { compute: (row) => decryptString(row.city, "customer-address") ?? "", needs: { city: true } },
      complement: { compute: (row) => decryptString(row.complement, "customer-address"), needs: { complement: true } },
      district: { compute: (row) => decryptString(row.district, "customer-address") ?? "", needs: { district: true } },
      label: { compute: (row) => decryptString(row.label, "customer-address"), needs: { label: true } },
      number: { compute: (row) => decryptString(row.number, "customer-address") ?? "", needs: { number: true } },
      postalCode: { compute: (row) => decryptString(row.postalCode, "customer-address") ?? "", needs: { postalCode: true } },
      recipient: { compute: (row) => decryptString(row.recipient, "customer-address") ?? "", needs: { recipient: true } },
      state: { compute: (row) => decryptString(row.state, "customer-address") ?? "", needs: { state: true } },
      street: { compute: (row) => decryptString(row.street, "customer-address") ?? "", needs: { street: true } }
    },
    order: {
      billingAddress: {
        compute: (row) => decryptJson(row.billingAddress, "order-billing-address", null),
        needs: { billingAddress: true }
      },
      customerNote: {
        compute: (row) => decryptString(row.customerNote, "order-customer-note"),
        needs: { customerNote: true }
      },
      customerSnapshot: {
        compute: (row) => decryptJson(row.customerSnapshot, "order-customer-snapshot", {}),
        needs: { customerSnapshot: true }
      },
      shippingAddress: {
        compute: (row) => decryptJson(row.shippingAddress, "order-shipping-address", {}),
        needs: { shippingAddress: true }
      }
    },
    supportTicket: {
      message: { compute: (row) => decryptString(row.message, "support-message") ?? "", needs: { message: true } },
      name: { compute: (row) => decryptString(row.name, "user-name") ?? "", needs: { name: true } },
      phone: { compute: (row) => decryptString(row.phone, "user-phone"), needs: { phone: true } },
      ratingComment: {
        compute: (row) => decryptString(row.ratingComment, "support-rating-comment"),
        needs: { ratingComment: true }
      },
      reopenReason: {
        compute: (row) => decryptString(row.reopenReason, "support-reopen-reason"),
        needs: { reopenReason: true }
      }
    },
    supportTicketReply: {
      message: {
        compute: (row) => decryptString(row.message, "support-reply-message") ?? "",
        needs: { message: true }
      }
    },
    user: {
      adminNotes: { compute: (row) => decryptString(row.adminNotes, "user-admin-notes"), needs: { adminNotes: true } },
      cpf: { compute: (row) => decryptString(row.cpf, "user-cpf"), needs: { cpf: true } },
      name: { compute: (row) => decryptString(row.name, "user-name"), needs: { name: true } },
      phone: { compute: (row) => decryptString(row.phone, "user-phone"), needs: { phone: true } }
    }
  }
}) as unknown as PrismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
