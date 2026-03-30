import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Period = "today" | "week" | "month"

function getStartDate(period: Period): Date {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  if (period === "week") {
    const day = start.getDay()
    start.setDate(start.getDate() - day)
  } else if (period === "month") {
    start.setDate(1)
  }

  return start
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get("period") ?? "today") as Period
    const metric = searchParams.get("metric") ?? "all"

    if (!["today", "week", "month"].includes(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 })
    }

    const startDate = getStartDate(period)

    // Fetch all data in parallel using groupBy queries (no N+1)
    const [
      claimsByEmployee,
      apptsByEmployee,
      clockEvents,
      procsByProvider,
      employees,
      providers,
    ] = await Promise.all([
      // Claims processed per employee (from security logs)
      metric === "all" || metric === "claims"
        ? prisma.securityLog.groupBy({
            by: ["employeeId"],
            where: {
              logDateTime: { gte: startDate },
              permType: { in: ["ClaimCreate", "ClaimSent", "ClaimEdit"] },
              employeeId: { not: null },
            },
            _count: true,
          })
        : Promise.resolve([]),

      // Appointments handled per employee
      metric === "all" || metric === "appointments"
        ? prisma.securityLog.groupBy({
            by: ["employeeId"],
            where: {
              logDateTime: { gte: startDate },
              permType: {
                in: [
                  "AppointmentCreate",
                  "AppointmentEdit",
                  "AppointmentComplete",
                ],
              },
              employeeId: { not: null },
            },
            _count: true,
          })
        : Promise.resolve([]),

      // Hours worked per employee (from clock events)
      metric === "all" || metric === "hours"
        ? prisma.clockEvent.findMany({
            where: { timeIn: { gte: startDate }, clockStatus: "Home" },
            select: { employeeId: true, timeIn: true, timeOut: true },
          })
        : Promise.resolve([]),

      // Procedures entered (for providers)
      metric === "all" || metric === "procedures"
        ? prisma.procedureLog.groupBy({
            by: ["provNum"],
            where: { procDate: { gte: startDate }, procStatus: "C" },
            _count: true,
            _sum: { procFee: true },
          })
        : Promise.resolve([]),

      // All non-hidden employees for name lookup
      prisma.employee.findMany({
        where: { isHidden: false },
        select: { id: true, firstName: true, lastName: true },
      }),

      // Providers for procedure mapping
      prisma.provider.findMany({
        where: { isHidden: false },
        select: { id: true, firstName: true, lastName: true },
      }),
    ])

    // Build lookup maps
    const employeeMap = new Map(
      employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`])
    )

    const providerMap = new Map(
      providers.map((p) => [p.id, `${p.firstName} ${p.lastName}`])
    )

    const claimsMap = new Map<number, number>()
    for (const row of claimsByEmployee) {
      if (row.employeeId !== null) {
        claimsMap.set(row.employeeId, row._count)
      }
    }

    const apptsMap = new Map<number, number>()
    for (const row of apptsByEmployee) {
      if (row.employeeId !== null) {
        apptsMap.set(row.employeeId, row._count)
      }
    }

    // Sum hours per employee from clock events
    const hoursMap = new Map<number, number>()
    for (const event of clockEvents) {
      const end = event.timeOut
        ? new Date(event.timeOut).getTime()
        : Date.now()
      const start = new Date(event.timeIn).getTime()
      const hours = (end - start) / 3600000
      hoursMap.set(
        event.employeeId,
        (hoursMap.get(event.employeeId) ?? 0) + hours
      )
    }

    // Procedures map (by provNum -> needs mapping to employee via UserOd)
    const procsMap = new Map<number, { count: number; production: number }>()
    for (const row of procsByProvider) {
      procsMap.set(row.provNum, {
        count: row._count,
        production: row._sum.procFee ?? 0,
      })
    }

    // Map provider procedures to employees via UserOd
    const userOds = await prisma.userOd.findMany({
      where: { providerNum: { not: null }, employeeNum: { not: null } },
      select: { employeeNum: true, providerNum: true },
    })

    const provToEmployeeMap = new Map<number, number>()
    for (const u of userOds) {
      if (u.providerNum !== null && u.employeeNum !== null) {
        provToEmployeeMap.set(u.providerNum, u.employeeNum)
      }
    }

    // Build merged employee data
    // Collect all employee IDs that have any data
    const allEmployeeIds = new Set<number>()
    for (const id of employeeMap.keys()) allEmployeeIds.add(id)

    const result = Array.from(allEmployeeIds).map((id) => {
      const claims = claimsMap.get(id) ?? 0
      const appointments = apptsMap.get(id) ?? 0
      const hours = Math.round((hoursMap.get(id) ?? 0) * 100) / 100

      // Check if this employee is linked to a provider
      let procedures = 0
      let production = 0
      for (const [provNum, empNum] of provToEmployeeMap.entries()) {
        if (empNum === id) {
          const procData = procsMap.get(provNum)
          if (procData) {
            procedures += procData.count
            production += procData.production
          }
        }
      }

      // Also check if the employee ID is a provider ID directly
      const directProc = procsMap.get(id)
      if (directProc && procedures === 0) {
        procedures = directProc.count
        production = directProc.production
      }

      return {
        id,
        name: employeeMap.get(id) ?? `Employee ${id}`,
        claims,
        appointments,
        procedures,
        hours,
        production: Math.round(production * 100) / 100,
      }
    })

    // Filter out employees with zero activity across all metrics
    const activeEmployees = result.filter(
      (e) =>
        e.claims > 0 ||
        e.appointments > 0 ||
        e.procedures > 0 ||
        e.hours > 0 ||
        e.production > 0
    )

    return NextResponse.json({ employees: activeEmployees })
  } catch (error) {
    console.error("Productivity API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch productivity data" },
      { status: 500 }
    )
  }
}
