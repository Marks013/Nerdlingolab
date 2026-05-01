import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://nerdlingolab:nerdlingolab_dev_password@localhost:5432/nerdlingolab"
});
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  await prisma.loyaltyProgramSettings.upsert({
    where: { singletonKey: "default" },
    create: { singletonKey: "default" },
    update: {}
  });

  await ensureDefaultManualShippingRates();

  const superadminName: string = process.env.SUPERADMIN_NAME ?? "NerdLingoLab Admin";
  const superadminEmail: string | undefined = process.env.SUPERADMIN_EMAIL;
  const superadminPassword: string | undefined = process.env.SUPERADMIN_PASSWORD;

  if (!superadminEmail || !superadminPassword) {
    throw new Error("SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be defined before seeding.");
  }

  const existingSuperadmin = await prisma.user.findUnique({
    where: { email: superadminEmail }
  });

  const passwordHash: string = await bcrypt.hash(superadminPassword, 12);

  if (existingSuperadmin) {
    await prisma.user.update({
      where: { id: existingSuperadmin.id },
      data: {
        name: superadminName,
        passwordHash,
        role: UserRole.SUPERADMIN
      }
    });
    return;
  }

  await prisma.user.create({
    data: {
      name: superadminName,
      email: superadminEmail,
      passwordHash,
      role: UserRole.SUPERADMIN,
      loyaltyPoints: {
        create: {}
      }
    }
  });
}

async function ensureDefaultManualShippingRates(): Promise<void> {
  const existingCount = await prisma.manualShippingRate.count();

  if (existingCount > 0) {
    return;
  }

  await prisma.manualShippingRate.createMany({
    data: [
      {
        description: "Opção padrão com melhor custo para pedidos nacionais.",
        estimatedBusinessDays: 7,
        name: "Frete padrão econômico",
        priceCents: 1490,
        sortOrder: 10
      },
      {
        description: "Opção rápida para clientes que querem receber antes.",
        estimatedBusinessDays: 3,
        name: "Frete rápido prioritário",
        priceCents: 2490,
        sortOrder: 20
      }
    ]
  });
}

main()
  .catch((error: unknown) => {
    throw error;
  })
  .finally(async (): Promise<void> => {
    await prisma.$disconnect();
  });
