import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function parseTimeString(dateBase: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number)
  const result = new Date(dateBase)
  result.setHours(hours, minutes, 0, 0)
  return result
}

function diffMinutes(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 60000)
}

function formatTime(date: Date | null): string | null {
  if (!date) return null
  return date.toISOString()
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get("date")

    const targetDate = dateParam ? new Date(dateParam) : new Date()
    targetDate.setHours(0, 0, 0, 0)
    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    // Fetch all data in parallel
    const [schedules, clockEvents, employees] = await Promise.all([
      // Get employee schedules for the date (schedType=2)
      prisma.schedule.findMany({
        where: {
          schedDate: { gte: targetDate, lt: nextDay },
          schedType: 2,
        },
      }),

      // Get clock events for the date
      prisma.clockEvent.findMany({
        where: {
          timeIn: { gte: targetDate, lt: nextDay },
        },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),

      // Get employee names
      prisma.employee.findMany({
        where: { isHidden: false },
        select: { id: true, firstName: true, lastName: true },
      }),
    ])

    // Build employee name map
    const employeeMap = new Map(
      employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`])
    )

    // Build clock events map per employee (first clock-in and last clock-out)
    const clockByEmployee = new Map<
      number,
      { firstIn: Date; lastOut: Date | null }
    >()
    for (const event of clockEvents) {
      const existing = clockByEmployee.get(event.employeeId)
      const timeIn = new Date(event.timeIn)
      const timeOut = event.timeOut ? new Date(event.timeOut) : null

      if (!existing) {
        clockByEmployee.set(event.employeeId, {
          firstIn: timeIn,
          lastOut: timeOut,
        })
      } else {
        if (timeIn < existing.firstIn) {
          existing.firstIn = timeIn
        }
        if (timeOut) {
          if (!existing.lastOut || timeOut > existing.lastOut) {
            existing.lastOut = timeOut
          }
        }
      }
    }

    // Build schedule map per employee
    const scheduleByEmployee = new Map<
      number,
      { startTime: string; stopTime: string }
    >()
    for (const sched of schedules) {
      if (sched.employeeNum !== null) {
        scheduleByEmployee.set(sched.employeeNum, {
          startTime: sched.startTime,
          stopTime: sched.stopTime,
        })
      }
    }

    // Build comparisons for each scheduled employee
    const comparisons = []
    let totalScheduledHours = 0
    let totalActualHours = 0
    let lateCount = 0
    let earlyOutCount = 0
    let absentCount = 0

    for (const [employeeId, schedule] of scheduleByEmployee.entries()) {
      const scheduledStart = parseTimeString(targetDate, schedule.startTime)
      const scheduledEnd = parseTimeString(targetDate, schedule.stopTime)
      const scheduledHours =
        Math.round(
          ((scheduledEnd.getTime() - scheduledStart.getTime()) / 3600000) * 100
        ) / 100

      totalScheduledHours += scheduledHours

      const clock = clockByEmployee.get(employeeId)
      const flags: string[] = []

      if (!clock) {
        // Absent
        flags.push("absent")
        absentCount++

        comparisons.push({
          employeeId,
          employeeName: employeeMap.get(employeeId) ?? `Employee ${employeeId}`,
          scheduledStart: formatTime(scheduledStart),
          scheduledEnd: formatTime(scheduledEnd),
          actualStart: null,
          actualEnd: null,
          lateMinutes: 0,
          earlyMinutes: 0,
          flags,
          scheduledHours,
          actualHours: 0,
        })
        continue
      }

      // Calculate late minutes
      const lateMinutes = Math.max(0, diffMinutes(clock.firstIn, scheduledStart))
      if (lateMinutes > 5) {
        flags.push("late")
        lateCount++
      }

      // Calculate early departure minutes
      let earlyMinutes = 0
      if (clock.lastOut) {
        earlyMinutes = Math.max(0, diffMinutes(scheduledEnd, clock.lastOut))
        if (earlyMinutes > 5) {
          flags.push("early_out")
          earlyOutCount++
        }
      }

      // Actual hours worked
      const actualEnd = clock.lastOut ?? new Date()
      const actualHours =
        Math.round(
          ((actualEnd.getTime() - clock.firstIn.getTime()) / 3600000) * 100
        ) / 100

      totalActualHours += actualHours

      comparisons.push({
        employeeId,
        employeeName: employeeMap.get(employeeId) ?? `Employee ${employeeId}`,
        scheduledStart: formatTime(scheduledStart),
        scheduledEnd: formatTime(scheduledEnd),
        actualStart: formatTime(clock.firstIn),
        actualEnd: clock.lastOut ? formatTime(clock.lastOut) : null,
        lateMinutes,
        earlyMinutes,
        flags,
        scheduledHours,
        actualHours,
      })
    }

    // Sort: absent at bottom, then by employee name
    comparisons.sort((a, b) => {
      const aAbsent = a.flags.includes("absent") ? 1 : 0
      const bAbsent = b.flags.includes("absent") ? 1 : 0
      if (aAbsent !== bAbsent) return aAbsent - bAbsent
      return a.employeeName.localeCompare(b.employeeName)
    })

    totalScheduledHours = Math.round(totalScheduledHours * 100) / 100
    totalActualHours = Math.round(totalActualHours * 100) / 100

    return NextResponse.json({
      comparisons,
      summary: {
        totalScheduledHours,
        totalActualHours,
        lateCount,
        earlyOutCount,
        absentCount,
      },
    })
  } catch (error) {
    console.error("Schedule compare API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch schedule comparison data" },
      { status: 500 }
    )
  }
}
