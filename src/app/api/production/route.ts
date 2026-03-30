import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  startOfMonth,
  format,
} from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") ?? "today"

    const now = new Date()
    let dateStart: Date
    let dateEnd: Date = endOfDay(now)
    let dayCount: number

    switch (period) {
      case "week":
        dateStart = startOfWeek(now, { weekStartsOn: 1 })
        dayCount = 7
        break
      case "month":
        dateStart = startOfMonth(now)
        dayCount = 30
        break
      default: // "today"
        dateStart = startOfDay(now)
        dayCount = 1
        break
    }

    // Fetch completed procedures in the date range
    const procedures = await prisma.procedureLog.findMany({
      where: {
        procStatus: "C",
        procDate: {
          gte: dateStart,
          lte: dateEnd,
        },
      },
      select: {
        provNum: true,
        procFee: true,
        procDate: true,
      },
    })

    const total = procedures.reduce((sum, p) => sum + p.procFee, 0)
    const procedureCount = procedures.length

    // Gather unique provider IDs and batch-fetch names
    const provNums = [...new Set(procedures.map((p) => p.provNum))]

    const providers =
      provNums.length > 0
        ? await prisma.provider.findMany({
            where: { id: { in: provNums } },
            select: { id: true, firstName: true, lastName: true },
          })
        : []

    const providerMap = new Map(
      providers.map((p) => [p.id, `${p.firstName} ${p.lastName}`])
    )

    // Aggregate by provider
    const providerTotals = new Map<
      number,
      { total: number; count: number }
    >()
    for (const proc of procedures) {
      const entry = providerTotals.get(proc.provNum) ?? {
        total: 0,
        count: 0,
      }
      entry.total += proc.procFee
      entry.count += 1
      providerTotals.set(proc.provNum, entry)
    }

    const byProvider = Array.from(providerTotals.entries()).map(
      ([provNum, data]) => ({
        provNum,
        provName: providerMap.get(provNum) ?? `Provider #${provNum}`,
        total: Math.round(data.total * 100) / 100,
        count: data.count,
      })
    )

    // Aggregate by day for charting
    const chartStart =
      period === "today" ? startOfDay(now) : subDays(now, dayCount - 1)

    const byDayMap = new Map<string, number>()

    // Initialize all days with 0
    for (let i = 0; i < dayCount; i++) {
      const day = format(
        period === "today" ? now : subDays(now, dayCount - 1 - i),
        "yyyy-MM-dd"
      )
      byDayMap.set(day, 0)
    }

    for (const proc of procedures) {
      const day = format(proc.procDate, "yyyy-MM-dd")
      byDayMap.set(day, (byDayMap.get(day) ?? 0) + proc.procFee)
    }

    const byDay = Array.from(byDayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayTotal]) => ({
        date,
        total: Math.round(dayTotal * 100) / 100,
      }))

    return NextResponse.json({
      total: Math.round(total * 100) / 100,
      procedureCount,
      byProvider,
      byDay,
    })
  } catch (error) {
    console.error("Production API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch production data" },
      { status: 500 }
    )
  }
}
