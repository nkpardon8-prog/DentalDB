import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const syncStates = await prisma.syncState.findMany()
  const settings = await prisma.officeSetting.findFirst()

  return NextResponse.json({
    configured: !!settings,
    syncEnabled: settings?.syncEnabled ?? false,
    lastSyncAt: settings?.lastSyncAt,
    endpoints: syncStates,
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const settings = await prisma.officeSetting.findFirst()
  if (!settings || !settings.mysqlUser) {
    return NextResponse.json({ error: "Practice management system not configured. Go to Settings." }, { status: 400 })
  }

  // Fire and forget — don't block the HTTP response
  // The sync worker will pick it up, or we trigger it here
  try {
    const { createAdapter } = await import("@/lib/adapters/factory")
    const { syncAll } = await import("@/lib/open-dental/sync")

    const adapter = createAdapter(settings)

    // Don't await — let it run in background
    syncAll(prisma, adapter)
      .catch(console.error)
      .finally(() => adapter.close?.())

    return NextResponse.json({ status: "started", message: "Sync started in background" })
  } catch (error) {
    return NextResponse.json({ error: "Failed to start sync" }, { status: 500 })
  }
}
