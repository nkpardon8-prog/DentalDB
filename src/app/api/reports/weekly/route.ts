import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateReport } from "@/lib/reports/generator"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const officeSetting = await prisma.officeSetting.findFirst()
  const officeName = officeSetting?.officeName || "Dental Office"

  // Last 7 days ending today
  const endDate = new Date()
  endDate.setHours(23, 59, 59, 999)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 6)
  startDate.setHours(0, 0, 0, 0)

  const rows: Record<string, any>[] = []
  let totalHours = 0
  let totalProduction = 0
  let totalAppointments = 0
  let totalClaims = 0

  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(startDate)
    dayStart.setDate(startDate.getDate() + i)
    dayStart.setHours(0, 0, 0, 0)

    const dayEnd = new Date(dayStart)
    dayEnd.setHours(23, 59, 59, 999)

    // Hours from clock events
    const clockEvents = await prisma.clockEvent.findMany({
      where: { timeIn: { gte: dayStart, lte: dayEnd } },
    })

    let dayHours = 0
    for (const event of clockEvents) {
      if (event.timeOut) {
        const diffMs = new Date(event.timeOut).getTime() - new Date(event.timeIn).getTime()
        dayHours += diffMs / (1000 * 60 * 60)
      }
    }

    // Production
    const procs = await prisma.procedureLog.aggregate({
      where: {
        procDate: { gte: dayStart, lte: dayEnd },
        procStatus: "C",
      },
      _sum: { procFee: true },
    })
    const dayProduction = procs._sum.procFee || 0

    // Appointments completed
    const dayAppointments = await prisma.appointment.count({
      where: {
        aptDateTime: { gte: dayStart, lte: dayEnd },
        aptStatus: "Complete",
      },
    })

    // Claims sent
    const dayClaims = await prisma.claim.count({
      where: {
        dateSent: { gte: dayStart, lte: dayEnd },
      },
    })

    const dateLabel = dayStart.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })

    rows.push({
      date: dateLabel,
      hours: dayHours,
      production: dayProduction,
      appointments: dayAppointments,
      claims: dayClaims,
    })

    totalHours += dayHours
    totalProduction += dayProduction
    totalAppointments += dayAppointments
    totalClaims += dayClaims
  }

  const subtitle = `${startDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })} — ${endDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`

  const pdf = await generateReport({
    title: `${officeName} — Weekly Summary`,
    subtitle,
    columns: [
      { header: "Date", key: "date", width: 120 },
      { header: "Hours", key: "hours", width: 90, align: "right", format: "hours" },
      { header: "Production", key: "production", width: 110, align: "right", format: "currency" },
      { header: "Appointments", key: "appointments", width: 96, align: "center", format: "number" },
      { header: "Claims", key: "claims", width: 96, align: "center", format: "number" },
    ],
    rows,
    summary: {
      date: "TOTAL",
      hours: totalHours,
      production: totalProduction,
      appointments: totalAppointments,
      claims: totalClaims,
    },
  })

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="weekly-summary-${endDate.toISOString().slice(0, 10)}.pdf"`,
    },
  })
}
