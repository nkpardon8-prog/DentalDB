import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ---------------------------------------------------------------------------
// Helpers: compute actual value for a goal
// ---------------------------------------------------------------------------

function getStartOfWeek(): Date {
  const d = new Date()
  const day = d.getDay() // 0 = Sunday
  const diff = d.getDate() - day // Start week on Sunday
  const start = new Date(d)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  return start
}

function getStartOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function getPeriodStart(period: string): Date {
  return period === "weekly" ? getStartOfWeek() : getStartOfToday()
}

async function computeActuals(
  goals: { id: string; type: string; period: string; target: number; employeeId: number | null }[],
) {
  const startOfToday = getStartOfToday()
  const startOfWeek = getStartOfWeek()

  // Batch-fetch all needed aggregates to avoid N+1 queries
  const [
    productionDaily,
    productionWeekly,
    claimsDaily,
    claimsWeekly,
    appointmentsDaily,
    appointmentsWeekly,
  ] = await Promise.all([
    prisma.procedureLog.aggregate({
      where: { procStatus: "C", procDate: { gte: startOfToday } },
      _sum: { procFee: true },
    }),
    prisma.procedureLog.aggregate({
      where: { procStatus: "C", procDate: { gte: startOfWeek } },
      _sum: { procFee: true },
    }),
    prisma.claim.count({
      where: { dateSent: { gte: startOfToday } },
    }),
    prisma.claim.count({
      where: { dateSent: { gte: startOfWeek } },
    }),
    prisma.appointment.count({
      where: { aptStatus: "Complete", aptDateTime: { gte: startOfToday } },
    }),
    prisma.appointment.count({
      where: { aptStatus: "Complete", aptDateTime: { gte: startOfWeek } },
    }),
  ])

  // Lookup table: "type/period" -> actual value
  const actualsMap: Record<string, number> = {
    "production/daily": productionDaily._sum.procFee ?? 0,
    "production/weekly": productionWeekly._sum.procFee ?? 0,
    "claims/daily": claimsDaily,
    "claims/weekly": claimsWeekly,
    "appointments/daily": appointmentsDaily,
    "appointments/weekly": appointmentsWeekly,
  }

  return goals.map((goal) => {
    const key = `${goal.type}/${goal.period}`
    const actual = actualsMap[key] ?? 0
    const progress = goal.target > 0 ? Math.min((actual / goal.target) * 100, 100) : 0

    return {
      ...goal,
      actual: Math.round(actual * 100) / 100,
      progress: Math.round(progress * 10) / 10,
    }
  })
}

// ---------------------------------------------------------------------------
// GET: List all goals with computed progress
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const goals = await prisma.goal.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  })

  const goalsWithProgress = await computeActuals(goals)

  return NextResponse.json({ goals: goalsWithProgress })
}

// ---------------------------------------------------------------------------
// POST: Create a goal
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { type, period, target, employeeId } = body

  if (!type || !period || target == null) {
    return NextResponse.json(
      { error: "Missing required fields: type, period, target" },
      { status: 400 },
    )
  }

  const validTypes = ["production", "claims", "appointments"]
  const validPeriods = ["daily", "weekly"]

  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 })
  }
  if (!validPeriods.includes(period)) {
    return NextResponse.json({ error: `Invalid period. Must be one of: ${validPeriods.join(", ")}` }, { status: 400 })
  }

  const goal = await prisma.goal.create({
    data: {
      type,
      period,
      target: Number(target),
      employeeId: employeeId ? Number(employeeId) : null,
    },
  })

  return NextResponse.json({ goal }, { status: 201 })
}

// ---------------------------------------------------------------------------
// DELETE: Delete a goal by id
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Missing goal id" }, { status: 400 })
  }

  await prisma.goal.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
