import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, parseISO } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    // Build where clause
    const where: Record<string, unknown> = {}

    if (statusFilter && statusFilter !== "All") {
      where.claimStatus = statusFilter
    }

    if (dateFrom || dateTo) {
      const dateCondition: Record<string, Date> = {}
      if (dateFrom) {
        dateCondition.gte = startOfDay(parseISO(dateFrom))
      }
      if (dateTo) {
        dateCondition.lte = endOfDay(parseISO(dateTo))
      }
      where.dateSent = dateCondition
    }

    const claims = await prisma.claim.findMany({
      where,
      orderBy: { id: "desc" },
    })

    // Fetch all claims (unfiltered) for summary counts
    const allClaims = statusFilter || dateFrom || dateTo
      ? await prisma.claim.findMany({ select: { claimStatus: true, dateSent: true, dateReceived: true } })
      : claims.map((c) => ({ claimStatus: c.claimStatus, dateSent: c.dateSent, dateReceived: c.dateReceived }))

    const summary = {
      total: allClaims.length,
      unsent: allClaims.filter((c) => c.claimStatus === "Unsent").length,
      sent: allClaims.filter((c) => c.claimStatus === "Sent").length,
      waiting: allClaims.filter(
        (c) => c.claimStatus === "WaitingToSend" || c.claimStatus === "Waiting"
      ).length,
      received: allClaims.filter((c) => c.claimStatus === "Received").length,
    }

    // Recent activity: claims sent or received today
    const todayStart = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())

    const recentActivity = await prisma.claim.findMany({
      where: {
        OR: [
          { dateSent: { gte: todayStart, lte: todayEnd } },
          { dateReceived: { gte: todayStart, lte: todayEnd } },
        ],
      },
      orderBy: { id: "desc" },
    })

    return NextResponse.json({
      claims,
      summary,
      recentActivity,
    })
  } catch (error) {
    console.error("Claims API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch claims" },
      { status: 500 }
    )
  }
}
