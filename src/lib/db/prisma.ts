import { PrismaClient } from "../../generated/client";

// Prevent multiple Prisma Client instances in development
// (Next.js hot-reloads create new instances each time).

const globalForPrisma = globalThis as unknown as {
  prisma_new: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma_new ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma_new = prisma;
}
