import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const settings = await prisma.officeSetting.findFirst()
  if (!settings || (!settings.mysqlUser && !settings.kollaToken)) {
    return NextResponse.json({ error: "Not configured" }, { status: 400 })
  }

  try {
    const { createAdapter } = await import("@/lib/adapters/factory")
    const adapter = createAdapter(settings)
    try {
      const ok = await adapter.testConnection()
      if (ok) {
        return NextResponse.json({ status: "connected" })
      }
      return NextResponse.json({ error: "Connection failed" }, { status: 502 })
    } finally {
      await adapter.close?.()
    }
  } catch (error) {
    return NextResponse.json({ error: "Connection failed" }, { status: 502 })
  }
}
