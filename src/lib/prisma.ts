import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Test connection on startup (only logs, doesn't crash)
prisma
  .$connect()
  .then(() => console.log("✅ Prisma connected to database"))
  .catch((err) => console.error("⚠️ Prisma connection error:", err.message));

export default prisma;
