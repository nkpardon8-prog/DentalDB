import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const dateParam = searchParams.get("date")

    const targetDate = dateParam ? new Date(dateParam) : new Date()
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    const clockEvents = await prisma.clockEvent.findMany({
      where: {
        timeIn: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: { employee: true },
      orderBy: { timeIn: "desc" },
    })

    // Build per-employee summary
    const employeeMap = new Map<
      number,
      {
        employeeId: number
        employeeName: string
        totalHours: number
        overtimeHours: number
        isRemote: boolean
        clockedIn: boolean
        currentStatus: string
      }
    >()

    const now = new Date()

    for (const event of clockEvents) {
      const existing = employeeMap.get(event.employeeId)

      const timeOut = event.timeOut ? new Date(event.timeOut) : now
      const timeIn = new Date(event.timeIn)
      const hours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
      const isClockedIn = event.timeOut === null

      if (existing) {
        existing.totalHours += hours
        existing.overtimeHours += event.overtimeHours
        if (event.isWorkingHome) existing.isRemote = true
        if (isClockedIn) {
          existing.clockedIn = true
          existing.currentStatus = event.clockStatus
        }
      } else {
        employeeMap.set(event.employeeId, {
          employeeId: event.employeeId,
          employeeName: `${event.employee.firstName} ${event.employee.lastName}`,
          totalHours: hours,
          overtimeHours: event.overtimeHours,
          isRemote: event.isWorkingHome,
          clockedIn: isClockedIn,
          currentStatus: isClockedIn ? event.clockStatus : "Out",
        })
      }
    }

    const summary = Array.from(employeeMap.values()).map((emp) => ({
      ...emp,
      totalHours: Math.round(emp.totalHours * 100) / 100,
      overtimeHours: Math.round(emp.overtimeHours * 100) / 100,
    }))

    return NextResponse.json({ clockEvents, summary })
  } catch (error) {
    console.error("Timeclock API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch timeclock data" },
      { status: 500 }
    )
  }
}
