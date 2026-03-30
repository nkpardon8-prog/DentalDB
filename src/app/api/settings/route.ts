import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { encrypt } from "@/lib/crypto"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const settings = await prisma.officeSetting.findFirst()
  const syncStates = await prisma.syncState.findMany()

  return NextResponse.json({
    settings: settings
      ? {
          officeName: settings.officeName,
          timezone: settings.timezone,
          mysqlHost: settings.mysqlHost,
          mysqlPort: settings.mysqlPort,
          mysqlUser: settings.mysqlUser,
          mysqlDatabase: settings.mysqlDatabase,
          syncEnabled: settings.syncEnabled,
          lastSyncAt: settings.lastSyncAt,
          dataSource: settings.dataSource,
          dataMode: settings.dataMode,
          hasConnection: !!(settings.mysqlUser || settings.kollaToken),
        }
      : null,
    syncStates,
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const body = await req.json()
  const { officeName, timezone, mysqlHost, mysqlPort, mysqlUser, mysqlPassword, mysqlDatabase, dataSource, kollaToken, kollaSecret } = body

  if (!officeName) {
    return NextResponse.json({ error: "Office name is required" }, { status: 400 })
  }

  const validSources = ["opendental", "eaglesoft", "dentrix"]
  if (dataSource && !validSources.includes(dataSource)) {
    return NextResponse.json({ error: "Invalid data source" }, { status: 400 })
  }

  const existing = await prisma.officeSetting.findFirst()

  // Clear synced data when switching PMS to prevent ID collisions
  if (existing && dataSource && existing.dataSource !== dataSource) {
    await prisma.$transaction([
      prisma.securityLog.deleteMany(),
      prisma.clockEvent.deleteMany(),
      prisma.userOd.deleteMany(),
      prisma.employee.deleteMany(),
      prisma.provider.deleteMany(),
      prisma.appointment.deleteMany(),
      prisma.claim.deleteMany(),
      prisma.procedureLog.deleteMany(),
      prisma.syncState.deleteMany(),
    ])
  }

  const data: any = {
    officeName,
    timezone: timezone || "America/New_York",
  }

  if (dataSource) data.dataSource = dataSource
  if (mysqlHost !== undefined) data.mysqlHost = mysqlHost
  if (mysqlPort !== undefined) data.mysqlPort = Number(mysqlPort)
  if (mysqlUser !== undefined) data.mysqlUser = mysqlUser
  if (mysqlPassword) data.mysqlPassword = encrypt(mysqlPassword)
  if (mysqlDatabase !== undefined) data.mysqlDatabase = mysqlDatabase
  if (kollaToken) data.kollaToken = encrypt(kollaToken)
  if (kollaSecret) data.kollaSecret = encrypt(kollaSecret)

  if (existing) {
    // If credentials are provided, transition to live mode
    if (mysqlUser || kollaToken) {
      data.dataMode = "live"
    }
    await prisma.officeSetting.update({
      where: { id: existing.id },
      data,
    })
  } else {
    if (!mysqlUser && !kollaToken) {
      return NextResponse.json({ error: "Connection credentials are required for initial setup" }, { status: 400 })
    }
    await prisma.officeSetting.create({
      data: {
        id: "default",
        dataMode: "live",
        ...data,
      },
    })
  }

  return NextResponse.json({ message: "Settings saved successfully" })
}
