import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma: PrismaClient = new PrismaClient();

async function main(): Promise<void> {
  const superadminName: string = process.env.SUPERADMIN_NAME ?? "NerdLingoLab Admin";
  const superadminEmail: string | undefined = process.env.SUPERADMIN_EMAIL;
  const superadminPassword: string | undefined = process.env.SUPERADMIN_PASSWORD;

  if (!superadminEmail || !superadminPassword) {
    throw new Error("SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be defined before seeding.");
  }

  const existingSuperadmin = await prisma.user.findUnique({
    where: { email: superadminEmail }
  });

  if (existingSuperadmin) {
    await prisma.user.update({
      where: { id: existingSuperadmin.id },
      data: { role: UserRole.SUPERADMIN }
    });
    return;
  }

  const passwordHash: string = await bcrypt.hash(superadminPassword, 12);

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

main()
  .catch((error: unknown) => {
    throw error;
  })
  .finally(async (): Promise<void> => {
    await prisma.$disconnect();
  });
