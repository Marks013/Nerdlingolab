import "dotenv/config";
import { defineConfig, env } from "prisma/config";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://nerdlingolab:nerdlingolab_dev_password@localhost:5432/nerdlingolab";
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    url: env("DATABASE_URL")
  }
});
