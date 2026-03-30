import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function computeStatus(
  latestClock: { timeOut: Date | null; clockStatus: string; isWorkingHome: boolean } | null
): { status: "online" | "break" | "lunch" | "offline"; isRemote: boolean } {
  if (!latestClock || latestClock.timeOut !== null) {
    return { status: "offline", isRemote: false }
  }
  if (latestClock.clockStatus === "Break") {
    return { status: "break", isRemote: latestClock.isWorkingHome }
  }
  if (latestClock.clockStatus === "Lunch") {
    return { status: "lunch", isRemote: latestClock.isWorkingHome }
  }
  return { status: "online", isRemote: latestClock.isWorkingHome }
}

async function getEmployeeDetail(id: number) {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [employee, todayClockEvents, recentLogs, todayStats] =
    await Promise.all([
      prisma.employee.findUnique({
        where: { id },
      }),

      prisma.clockEvent.findMany({
        where: {
          employeeId: id,
          timeIn: { gte: startOfToday },
        },
        orderBy: { timeIn: "desc" },
      }),

      prisma.securityLog.findMany({
        where: { employeeId: id },
        orderBy: { logDateTime: "desc" },
        take: 50,
      }),

      // Stats for today
      Promise.all([
        prisma.securityLog.count({
          where: {
            employeeId: id,
            logDateTime: { gte: startOfToday },
          },
        }),
        prisma.securityLog.count({
          where: {
            employeeId: id,
            logDateTime: { gte: startOfToday },
            permType: { startsWith: "Appointment" },
          },
        }),
        prisma.securityLog.count({
          where: {
            employeeId: id,
            logDateTime: { gte: startOfToday },
            permType: { startsWith: "Claim" },
          },
        }),
      ]),
    ])

  if (!employee) {
    return null
  }

  // Compute hours worked today from clock events
  let hoursToday = 0
  for (const event of todayClockEvents) {
    if (event.clockStatus !== "Home") continue
    const end = event.timeOut ? new Date(event.timeOut).getTime() : Date.now()
    const start = new Date(event.timeIn).getTime()
    hoursToday += (end - start) / 3600000
  }

  const latestClock = todayClockEvents.length > 0 ? todayClockEvents[0] : null
  const { status, isRemote } = computeStatus(latestClock)

  const [actionsToday, appointmentsToday, claimsToday] = todayStats

  return {
    ...employee,
    status,
    isRemote,
    hoursToday: Math.round(hoursToday * 100) / 100,
    actionsToday,
    appointmentsToday,
    claimsToday,
    todayClockEvents,
    recentLogs,
  }
}

async function getEmployeeList() {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const employees = await prisma.employee.findMany({
    where: { isHidden: false },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })

  // Batch fetch: latest clock event per employee for today
  const todayClockEvents = await prisma.clockEvent.findMany({
    where: {
      timeIn: { gte: startOfToday },
      employeeId: { in: employees.map((e) => e.id) },
    },
    orderBy: { timeIn: "desc" },
  })

  // Batch fetch: latest security log per employee
  const latestLogs = await prisma.securityLog.findMany({
    where: {
      employeeId: { in: employees.map((e) => e.id) },
    },
    orderBy: { logDateTime: "desc" },
  })

  // Batch fetch: today's action counts
  const todayActionCounts = await prisma.securityLog.groupBy({
    by: ["employeeId"],
    where: {
      logDateTime: { gte: startOfToday },
      employeeId: { in: employees.map((e) => e.id) },
    },
    _count: { id: true },
  })

  // Build lookup maps
  const clockByEmployee = new Map<number, (typeof todayClockEvents)[0]>()
  for (const event of todayClockEvents) {
    // First occurrence is latest due to desc ordering
    if (!clockByEmployee.has(event.employeeId)) {
      clockByEmployee.set(event.employeeId, event)
    }
  }

  const logByEmployee = new Map<number, (typeof latestLogs)[0]>()
  for (const log of latestLogs) {
    if (log.employeeId !== null && !logByEmployee.has(log.employeeId)) {
      logByEmployee.set(log.employeeId, log)
    }
  }

  const actionCountMap = new Map<number, number>()
  for (const row of todayActionCounts) {
    if (row.employeeId !== null) {
      actionCountMap.set(row.employeeId, row._count.id)
    }
  }

  return employees.map((emp) => {
    const latestClock = clockByEmployee.get(emp.id) ?? null
    const { status, isRemote } = computeStatus(latestClock)
    const latestLog = logByEmployee.get(emp.id)

    return {
      ...emp,
      status,
      isRemote,
      lastActivity: latestLog?.logDateTime ?? null,
      actionsToday: actionCountMap.get(emp.id) ?? 0,
      clockInTime: latestClock && !latestClock.timeOut ? latestClock.timeIn : null,
    }
  })
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const idParam = searchParams.get("id")

  if (idParam) {
    const id = parseInt(idParam, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 })
    }

    const employee = await getEmployeeDetail(id)
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json(employee)
  }

  const employees = await getEmployeeList()
  return NextResponse.json(employees)
}
