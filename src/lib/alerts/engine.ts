import type { PrismaClient } from "@prisma/client"

// ---------------------------------------------------------------------------
// Alert Rule Engine
// ---------------------------------------------------------------------------
// Checks 4 alert rules after each sync cycle:
//   1. Late Clock-in — employee has schedule but no clock event 15+ min past start
//   2. Long Break — break/lunch clock event open > 30 min
//   3. Claim Rejected — new rejected claims today
//   4. Patient No-Show — appointments with "Broken" status today
//
// Features:
//   - Deduplication: won't create duplicate alerts of same type+employee today
//   - Auto-resolve: marks stale alerts as autoResolved when condition clears
// ---------------------------------------------------------------------------

async function hasExistingAlert(
  prisma: PrismaClient,
  type: string,
  employeeId: number | null,
  startOfToday: Date,
): Promise<boolean> {
  const where: Record<string, unknown> = {
    type,
    dismissed: false,
    autoResolved: false,
    createdAt: { gte: startOfToday },
  }
  if (employeeId !== null) {
    where.employeeId = employeeId
  }
  const count = await prisma.alert.count({ where })
  return count > 0
}

// ---------------------------------------------------------------------------
// Rule 1: Late Clock-in
// ---------------------------------------------------------------------------

async function checkLateClockIn(
  prisma: PrismaClient,
  now: Date,
  startOfToday: Date,
): Promise<void> {
  // Get today's employee schedules (schedType 2 = Employee)
  const schedules = await prisma.schedule.findMany({
    where: {
      schedDate: { gte: startOfToday },
      employeeNum: { not: null },
    },
  })

  if (schedules.length === 0) return

  // Get today's clock events
  const clockEvents = await prisma.clockEvent.findMany({
    where: { timeIn: { gte: startOfToday } },
    select: { employeeId: true, timeIn: true },
  })
  const clockedInEmployees = new Set(clockEvents.map((ce) => ce.employeeId))

  for (const sched of schedules) {
    if (!sched.employeeNum) continue

    // Parse scheduled start time
    const [h, m] = sched.startTime.split(":").map(Number)
    const scheduledStart = new Date(startOfToday)
    scheduledStart.setHours(h, m, 0, 0)

    // Only alert if we're past the 15-min grace period
    const graceEnd = new Date(scheduledStart.getTime() + 15 * 60 * 1000)
    if (now < graceEnd) continue

    if (!clockedInEmployees.has(sched.employeeNum)) {
      // Check for existing alert to avoid duplicates
      const exists = await hasExistingAlert(prisma, "late_clockin", sched.employeeNum, startOfToday)
      if (exists) continue

      // Look up employee name
      const emp = await prisma.employee.findUnique({
        where: { id: sched.employeeNum },
        select: { firstName: true, lastName: true },
      })
      const name = emp ? `${emp.firstName} ${emp.lastName}` : `Employee #${sched.employeeNum}`

      await prisma.alert.create({
        data: {
          type: "late_clockin",
          severity: "warning",
          title: "Late Clock-in",
          message: `${name} was scheduled at ${sched.startTime} but has not clocked in.`,
          employeeId: sched.employeeNum,
        },
      })
    }
  }

  // Auto-resolve: if an employee who had a late_clockin alert has now clocked in
  const openLateAlerts = await prisma.alert.findMany({
    where: {
      type: "late_clockin",
      dismissed: false,
      autoResolved: false,
      createdAt: { gte: startOfToday },
    },
  })

  for (const alert of openLateAlerts) {
    if (alert.employeeId && clockedInEmployees.has(alert.employeeId)) {
      await prisma.alert.update({
        where: { id: alert.id },
        data: { autoResolved: true },
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Rule 2: Long Break (break/lunch open > 30 min)
// ---------------------------------------------------------------------------

async function checkLongBreak(
  prisma: PrismaClient,
  now: Date,
  startOfToday: Date,
): Promise<void> {
  // Find clock events today that are Break or Lunch with no timeOut
  const openBreaks = await prisma.clockEvent.findMany({
    where: {
      timeIn: { gte: startOfToday },
      timeOut: null,
      clockStatus: { in: ["Break", "Lunch"] },
    },
    include: {
      employee: { select: { firstName: true, lastName: true } },
    },
  })

  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000)

  for (const ce of openBreaks) {
    if (ce.timeIn > thirtyMinAgo) continue // not yet 30 min

    const exists = await hasExistingAlert(prisma, "long_break", ce.employeeId, startOfToday)
    if (exists) continue

    const name = ce.employee
      ? `${ce.employee.firstName} ${ce.employee.lastName}`
      : `Employee #${ce.employeeId}`
    const durationMin = Math.round((now.getTime() - ce.timeIn.getTime()) / 60000)

    await prisma.alert.create({
      data: {
        type: "long_break",
        severity: "warning",
        title: "Long Break",
        message: `${name} has been on ${ce.clockStatus.toLowerCase()} for ${durationMin} minutes.`,
        employeeId: ce.employeeId,
      },
    })
  }

  // Auto-resolve: if the break clock event now has a timeOut
  const openLongBreakAlerts = await prisma.alert.findMany({
    where: {
      type: "long_break",
      dismissed: false,
      autoResolved: false,
      createdAt: { gte: startOfToday },
    },
  })

  for (const alert of openLongBreakAlerts) {
    if (!alert.employeeId) continue
    // Check if there's still an open break for this employee
    const stillOnBreak = await prisma.clockEvent.count({
      where: {
        employeeId: alert.employeeId,
        timeIn: { gte: startOfToday },
        timeOut: null,
        clockStatus: { in: ["Break", "Lunch"] },
      },
    })
    if (stillOnBreak === 0) {
      await prisma.alert.update({
        where: { id: alert.id },
        data: { autoResolved: true },
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Rule 3: Claim Rejected
// ---------------------------------------------------------------------------

async function checkClaimRejected(
  prisma: PrismaClient,
  _now: Date,
  startOfToday: Date,
): Promise<void> {
  // Find claims with rejected-like statuses that were updated today
  // OD uses status codes: "R" can mean Received but we look for claims
  // that have claimStatus containing indicators of rejection.
  // Common rejected indicators: claimStatus "I" (Inactive/rejected) or
  // insPayAmt = 0 with dateReceived today.
  // For a broader check we look for claims synced today with insPayAmt of 0
  // and a dateReceived set (meaning the insurer responded with $0).
  const rejectedClaims = await prisma.claim.findMany({
    where: {
      dateReceived: { gte: startOfToday },
      insPayAmt: 0,
      claimFee: { not: null, gt: 0 },
    },
  })

  for (const claim of rejectedClaims) {
    // Dedup: use type + a deterministic key (no employeeId for claims, use null)
    const existingCount = await prisma.alert.count({
      where: {
        type: "claim_rejected",
        dismissed: false,
        autoResolved: false,
        createdAt: { gte: startOfToday },
        message: { contains: `Claim #${claim.id}` },
      },
    })
    if (existingCount > 0) continue

    await prisma.alert.create({
      data: {
        type: "claim_rejected",
        severity: "critical",
        title: "Claim Rejected",
        message: `Claim #${claim.id} for patient #${claim.patNum} was returned with $0 payment (fee: $${(claim.claimFee ?? 0).toFixed(2)}).`,
        employeeId: null,
      },
    })
  }
}

// ---------------------------------------------------------------------------
// Rule 4: Patient No-Show
// ---------------------------------------------------------------------------

async function checkNoShow(
  prisma: PrismaClient,
  _now: Date,
  startOfToday: Date,
): Promise<void> {
  const brokenApts = await prisma.appointment.findMany({
    where: {
      aptDateTime: { gte: startOfToday },
      aptStatus: "Broken",
    },
  })

  for (const apt of brokenApts) {
    const existingCount = await prisma.alert.count({
      where: {
        type: "no_show",
        dismissed: false,
        autoResolved: false,
        createdAt: { gte: startOfToday },
        message: { contains: `Appointment #${apt.id}` },
      },
    })
    if (existingCount > 0) continue

    await prisma.alert.create({
      data: {
        type: "no_show",
        severity: "warning",
        title: "Patient No-Show",
        message: `Appointment #${apt.id} for patient #${apt.patNum} was marked as broken (no-show).`,
        employeeId: null,
      },
    })
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function checkAlertRules(prisma: PrismaClient): Promise<void> {
  const now = new Date()
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  await checkLateClockIn(prisma, now, startOfToday)
  await checkLongBreak(prisma, now, startOfToday)
  await checkClaimRejected(prisma, now, startOfToday)
  await checkNoShow(prisma, now, startOfToday)
}
