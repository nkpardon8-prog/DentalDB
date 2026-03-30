import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, parseISO } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get("date")
    const targetDate = dateParam ? parseISO(dateParam) : new Date()

    const dayStart = startOfDay(targetDate)
    const dayEnd = endOfDay(targetDate)

    const appointments = await prisma.appointment.findMany({
      where: {
        aptDateTime: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      orderBy: { aptDateTime: "asc" },
    })

    // Gather unique provider IDs to batch-fetch names
    const provNums = [
      ...new Set(
        appointments
          .map((a) => a.provNum)
          .filter((n): n is number => n != null)
      ),
    ]

    const providers =
      provNums.length > 0
        ? await prisma.provider.findMany({
            where: { id: { in: provNums } },
            select: { id: true, firstName: true, lastName: true, abbr: true },
          })
        : []

    const providerMap = new Map(
      providers.map((p) => [p.id, `${p.firstName} ${p.lastName}`])
    )

    // Build summary counts
    const summary = {
      total: appointments.length,
      scheduled: appointments.filter((a) => a.aptStatus === "Scheduled").length,
      complete: appointments.filter((a) => a.aptStatus === "Complete").length,
      broken: appointments.filter((a) => a.aptStatus === "Broken").length,
      noShow: appointments.filter(
        (a) => a.aptStatus === "Broken/Missed" || a.aptStatus === "NoShow"
      ).length,
    }

    // Build per-provider breakdown
    const providerCounts = new Map<number, number>()
    for (const apt of appointments) {
      if (apt.provNum != null) {
        providerCounts.set(
          apt.provNum,
          (providerCounts.get(apt.provNum) ?? 0) + 1
        )
      }
    }

    const byProvider = Array.from(providerCounts.entries()).map(
      ([provNum, count]) => ({
        provNum,
        provName: providerMap.get(provNum) ?? `Provider #${provNum}`,
        count,
      })
    )

    return NextResponse.json({
      appointments,
      summary,
      byProvider,
    })
  } catch (error) {
    console.error("Appointments API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    )
  }
}
