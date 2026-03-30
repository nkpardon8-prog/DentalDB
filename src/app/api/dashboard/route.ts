import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [
    totalEmployees,
    onlineEmployees,
    completedAppointments,
    claimsSent,
    productionAgg,
    recentLogs,
    todayClockEvents,
    syncStates,
    officeSetting,
    alertCount,
    dailyProductionGoal,
  ] = await Promise.all([
    // Total non-hidden employees
    prisma.employee.count({
      where: { isHidden: false },
    }),

    // Employees currently clocked in: have a ClockEvent today with
    // timeOut === null and clockStatus === "Home"
    prisma.clockEvent.findMany({
      where: {
        timeIn: { gte: startOfToday },
        timeOut: null,
        clockStatus: "Home",
      },
      select: { employeeId: true },
      distinct: ["employeeId"],
    }),

    // Today's completed appointments
    prisma.appointment.count({
      where: {
        aptDateTime: { gte: startOfToday },
        aptStatus: "Complete",
      },
    }),

    // Today's claims sent
    prisma.claim.count({
      where: {
        dateSent: { gte: startOfToday },
      },
    }),

    // Today's production total (procStatus = "C" and procDate is today)
    prisma.procedureLog.aggregate({
      where: {
        procDate: { gte: startOfToday },
        procStatus: "C",
      },
      _sum: { procFee: true },
    }),

    // Recent 30 security logs with employee relation
    prisma.securityLog.findMany({
      orderBy: { logDateTime: "desc" },
      take: 30,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    }),

    // Today's clock events
    prisma.clockEvent.findMany({
      where: {
        timeIn: { gte: startOfToday },
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { timeIn: "desc" },
    }),

    // Sync status
    prisma.syncState.findMany(),

    // Office setting (first-run detection)
    prisma.officeSetting.findFirst({
      select: { id: true, dataMode: true },
    }),

    // Active alert count
    prisma.alert.count({
      where: { dismissed: false, autoResolved: false },
    }),

    // Daily production goal (office-wide)
    prisma.goal.findFirst({
      where: { type: "production", period: "daily", employeeId: null },
    }),
  ])

  // Compute goal progress if a daily production goal exists
  const productionTotal = productionAgg._sum.procFee ?? 0
  let goalProgress: { target: number; actual: number; progress: number } | null = null
  if (dailyProductionGoal) {
    const pct = dailyProductionGoal.target > 0
      ? Math.min((productionTotal / dailyProductionGoal.target) * 100, 100)
      : 0
    goalProgress = {
      target: dailyProductionGoal.target,
      actual: productionTotal,
      progress: Math.round(pct * 10) / 10,
    }
  }

  return NextResponse.json({
    totalEmployees,
    onlineCount: onlineEmployees.length,
    completedAppointments,
    claimsSent,
    productionTotal,
    recentLogs,
    todayClockEvents,
    syncStates,
    isFirstRun: !officeSetting,
    dataMode: officeSetting?.dataMode ?? "unconfigured",
    alertCount,
    goalProgress,
  })
}
