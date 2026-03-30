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

  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get("date")
  const targetDate = dateParam ? new Date(dateParam + "T00:00:00") : new Date()

  const dayStart = new Date(targetDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(targetDate)
  dayEnd.setHours(23, 59, 59, 999)

  const officeSetting = await prisma.officeSetting.findFirst()
  const officeName = officeSetting?.officeName || "Dental Office"

  // Fetch employees with clock events for the day
  const clockEvents = await prisma.clockEvent.findMany({
    where: {
      timeIn: { gte: dayStart, lte: dayEnd },
    },
    include: { employee: true },
  })

  // Calculate hours per employee
  const employeeHoursMap = new Map<number, { name: string; hours: number }>()
  for (const event of clockEvents) {
    const empId = event.employeeId
    const empName = `${event.employee.firstName} ${event.employee.lastName}`
    const existing = employeeHoursMap.get(empId) || { name: empName, hours: 0 }

    const endTime = event.timeOut ? new Date(event.timeOut).getTime() : Date.now()
    const diffMs = endTime - new Date(event.timeIn).getTime()
    existing.hours += diffMs / (1000 * 60 * 60)

    employeeHoursMap.set(empId, existing)
  }

  const employeeHours = Array.from(employeeHoursMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  const totalHours = employeeHours.reduce((sum, e) => sum + e.hours, 0)

  // Production per provider (completed procedures)
  const completedProcs = await prisma.procedureLog.findMany({
    where: {
      procDate: { gte: dayStart, lte: dayEnd },
      procStatus: "C",
    },
  })

  // Build production per provider map for row data
  const providerProduction = new Map<number, number>()
  let totalProduction = 0
  for (const proc of completedProcs) {
    totalProduction += proc.procFee
    const existing = providerProduction.get(proc.provNum) || 0
    providerProduction.set(proc.provNum, existing + proc.procFee)
  }

  // Appointments
  const appointments = await prisma.appointment.findMany({
    where: {
      aptDateTime: { gte: dayStart, lte: dayEnd },
    },
  })
  const appointmentsCompleted = appointments.filter((a) => a.aptStatus === "Complete").length
  const appointmentsTotal = appointments.length

  // Claims sent
  const claimsSent = await prisma.claim.count({
    where: {
      dateSent: { gte: dayStart, lte: dayEnd },
    },
  })

  // Build per-employee rows with production (match via provider)
  const providers = await prisma.provider.findMany()
  const providerNameMap = new Map<number, string>()
  for (const p of providers) {
    providerNameMap.set(p.id, `${p.firstName} ${p.lastName}`)
  }

  // Create report rows: one per employee
  const rows = employeeHours.map((emp) => ({
    employee: emp.name,
    hours: emp.hours,
    production: 0, // will be enriched below if employee is also a provider
    appointments: "",
    claims: "",
  }))

  // Add provider-only production rows if they didn't clock in
  for (const [provId, prod] of providerProduction) {
    const provName = providerNameMap.get(provId) || `Provider #${provId}`
    const existingRow = rows.find((r) => r.employee === provName)
    if (existingRow) {
      existingRow.production = prod
    } else {
      rows.push({
        employee: provName,
        hours: 0,
        production: prod,
        appointments: "",
        claims: "",
      })
    }
  }

  // If no data at all, create a placeholder row
  if (rows.length === 0) {
    rows.push({
      employee: "No data for this date",
      hours: 0,
      production: 0,
      appointments: "",
      claims: "",
    })
  }

  const dateStr = dayStart.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  let pdf: Buffer
  try {
  pdf = await generateReport({
    title: `${officeName} — Daily Production Report`,
    subtitle: dateStr,
    columns: [
      { header: "Employee", key: "employee", width: 150 },
      { header: "Hours Worked", key: "hours", width: 90, align: "right", format: "hours" },
      { header: "Production", key: "production", width: 100, align: "right", format: "currency" },
      { header: "Appointments", key: "appointments", width: 86, align: "center" },
      { header: "Claims", key: "claims", width: 86, align: "center" },
    ],
    rows,
    summary: {
      employee: "TOTAL",
      hours: totalHours,
      production: totalProduction,
      appointments: `${appointmentsCompleted}/${appointmentsTotal}`,
      claims: String(claimsSent),
    },
  })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json({ error: "Failed to generate PDF", details: String(error) }, { status: 500 })
  }

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="daily-report-${dateParam || dayStart.toISOString().slice(0, 10)}.pdf"`,
    },
  })
}
