import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://nerdlingolab:nerdlingolab_dev_password@localhost:5432/nerdlingolab";
const adapter = new PrismaPg({
  connectionString: databaseUrl
});

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.DEBUG_PRISMA_QUERIES === "true" ? ["query", "error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
