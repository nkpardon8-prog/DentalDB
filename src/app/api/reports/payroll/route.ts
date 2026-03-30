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
  const dateFromParam = searchParams.get("dateFrom")
  const dateToParam = searchParams.get("dateTo")

  // Default to current pay period: last 14 days
  const dateTo = dateToParam ? new Date(dateToParam + "T23:59:59.999") : new Date()
  dateTo.setHours(23, 59, 59, 999)

  const dateFrom = dateFromParam ? new Date(dateFromParam + "T00:00:00") : new Date()
  if (!dateFromParam) {
    dateFrom.setDate(dateFrom.getDate() - 13)
  }
  dateFrom.setHours(0, 0, 0, 0)

  const officeSetting = await prisma.officeSetting.findFirst()
  const officeName = officeSetting?.officeName || "Dental Office"

  // Fetch all clock events in the range
  const clockEvents = await prisma.clockEvent.findMany({
    where: {
      timeIn: { gte: dateFrom, lte: dateTo },
    },
    include: { employee: true },
    orderBy: { timeIn: "asc" },
  })

  // Aggregate per employee
  const employeeMap = new Map<
    number,
    {
      name: string
      regularHours: number
      overtimeHours: number
      breakTime: number
      totalHours: number
      daysWorked: Set<string>
      remoteDays: Set<string>
    }
  >()

  for (const event of clockEvents) {
    const empId = event.employeeId
    const empName = `${event.employee.firstName} ${event.employee.lastName}`
    const existing = employeeMap.get(empId) || {
      name: empName,
      regularHours: 0,
      overtimeHours: 0,
      breakTime: 0,
      totalHours: 0,
      daysWorked: new Set<string>(),
      remoteDays: new Set<string>(),
    }

    if (event.timeOut) {
      const diffMs = new Date(event.timeOut).getTime() - new Date(event.timeIn).getTime()
      const hours = diffMs / (1000 * 60 * 60)
      const dayKey = new Date(event.timeIn).toISOString().slice(0, 10)

      if (event.clockStatus === "Break" || event.clockStatus === "Lunch") {
        existing.breakTime += hours
      } else {
        existing.totalHours += hours
        existing.overtimeHours += event.overtimeHours
        existing.daysWorked.add(dayKey)

        if (event.isWorkingHome) {
          existing.remoteDays.add(dayKey)
        }
      }
    }

    employeeMap.set(empId, existing)
  }

  // Build rows
  const rows: Record<string, any>[] = []
  let totalRegular = 0
  let totalOvertime = 0
  let totalBreak = 0
  let totalTotal = 0

  const sortedEmployees = Array.from(employeeMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  for (const emp of sortedEmployees) {
    const regularHours = emp.totalHours - emp.overtimeHours
    rows.push({
      employee: emp.name,
      regularHours: regularHours > 0 ? regularHours : 0,
      overtimeHours: emp.overtimeHours,
      breakTime: emp.breakTime,
      totalHours: emp.totalHours,
      daysWorked: emp.daysWorked.size,
      remoteDays: emp.remoteDays.size,
    })
    totalRegular += regularHours > 0 ? regularHours : 0
    totalOvertime += emp.overtimeHours
    totalBreak += emp.breakTime
    totalTotal += emp.totalHours
  }

  if (rows.length === 0) {
    rows.push({
      employee: "No time clock data in range",
      regularHours: 0,
      overtimeHours: 0,
      breakTime: 0,
      totalHours: 0,
      daysWorked: 0,
      remoteDays: 0,
    })
  }

  const subtitle = `${dateFrom.toLocaleDateString("en-US", { month: "long", day: "numeric" })} — ${dateTo.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`

  const pdf = await generateReport({
    title: `${officeName} — Payroll Report`,
    subtitle,
    columns: [
      { header: "Employee", key: "employee", width: 120 },
      { header: "Regular Hrs", key: "regularHours", width: 72, align: "right", format: "hours" },
      { header: "Overtime Hrs", key: "overtimeHours", width: 72, align: "right", format: "hours" },
      { header: "Break Time", key: "breakTime", width: 72, align: "right", format: "hours" },
      { header: "Total Hrs", key: "totalHours", width: 72, align: "right", format: "hours" },
      { header: "Days", key: "daysWorked", width: 52, align: "center", format: "number" },
      { header: "Remote", key: "remoteDays", width: 52, align: "center", format: "number" },
    ],
    rows,
    summary: {
      employee: "TOTAL",
      regularHours: totalRegular,
      overtimeHours: totalOvertime,
      breakTime: totalBreak,
      totalHours: totalTotal,
      daysWorked: "",
      remoteDays: "",
    },
  })

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="payroll-report-${dateFrom.toISOString().slice(0, 10)}-to-${dateTo.toISOString().slice(0, 10)}.pdf"`,
    },
  })
}
