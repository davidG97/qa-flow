// Prisma configuration for QA Flow
import { defineConfig } from "prisma/config";

// Try to load .env file if it exists (dev), otherwise use env vars (Docker)
try {
  require("dotenv/config");
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL || "file:./dev.db",
  },
});
