import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12)

  await prisma.user.upsert({
    where: { email: "admin@dental.local" },
    update: {},
    create: {
      email: "admin@dental.local",
      name: "Admin",
      passwordHash,
      role: "ADMIN",
    },
  })

  console.log("Seeded admin user: admin@dental.local / admin123")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
