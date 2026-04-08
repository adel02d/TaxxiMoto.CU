import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

prisma
  .$connect()
  .then(() => console.log("Prisma connected"))
  .catch((err) => console.error("Prisma error:", err.message));

export default prisma;
