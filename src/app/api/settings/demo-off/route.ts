import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  // Atomic delete of all data + office settings
  await prisma.$transaction([
    prisma.alert.deleteMany(),
    prisma.goal.deleteMany(),
    prisma.securityLog.deleteMany(),
    prisma.clockEvent.deleteMany(),
    prisma.schedule.deleteMany(),
    prisma.insVerification.deleteMany(),
    prisma.userOd.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.claim.deleteMany(),
    prisma.procedureLog.deleteMany(),
    prisma.provider.deleteMany(),
    prisma.employee.deleteMany(),
    prisma.syncState.deleteMany(),
    prisma.emailSetting.deleteMany(),
    prisma.officeSetting.deleteMany(),
  ])

  return NextResponse.json({ message: "Demo data cleared. Configure your office in Settings to get started." })
}
