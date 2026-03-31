import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient(): PrismaClient {
  // In Lambda (Netlify serverless), the filesystem is read-only except /tmp.
  // Copy the bundled SQLite DB to /tmp so Prisma can open it with write access.
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const fs = require("fs") as typeof import("fs")
    const path = require("path") as typeof import("path")
    const tmpDb = "/tmp/demo.db"

    if (!fs.existsSync(tmpDb)) {
      const source = path.join(process.cwd(), "prisma", "dev.db")
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, tmpDb)
      }
    }

    return new PrismaClient({
      datasources: { db: { url: `file:${tmpDb}` } },
    })
  }

  return new PrismaClient()
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
