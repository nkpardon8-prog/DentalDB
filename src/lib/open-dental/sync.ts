import type { PrismaClient } from "@prisma/client"
import type { PmsAdapter } from "../adapters/types"

// ---------------------------------------------------------------------------
// Module-level mutex
// ---------------------------------------------------------------------------
let syncRunning = false

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getLastSyncStamp(
  prisma: PrismaClient,
  endpoint: string,
): Promise<Date> {
  const state = await prisma.syncState.findUnique({ where: { endpoint } })
  return state?.lastSyncStamp ?? new Date(0)
}

async function updateSyncState(
  prisma: PrismaClient,
  endpoint: string,
  itemsSynced: number,
  status: string,
  errorMessage?: string,
): Promise<void> {
  const now = new Date()
  await prisma.syncState.upsert({
    where: { endpoint },
    create: {
      endpoint,
      lastSyncStamp: now,
      lastRunAt: now,
      itemsSynced,
      status,
      errorMessage: errorMessage ?? null,
    },
    update: {
      lastSyncStamp: now,
      lastRunAt: now,
      itemsSynced,
      status,
      errorMessage: errorMessage ?? null,
    },
  })
}

function formatDateParam(d: Date): string {
  return d.toISOString().split("T")[0]
}

// ---------------------------------------------------------------------------
// Sync: Employees (full refresh)
// ---------------------------------------------------------------------------

async function syncEmployees(
  prisma: PrismaClient,
  adapter: PmsAdapter,
): Promise<number> {
  const rows = await adapter.getEmployees()
  if (rows.length === 0) return 0

  const now = new Date()

  await prisma.$transaction([
    prisma.employee.deleteMany(),
    prisma.employee.createMany({
      data: rows.map((e) => ({
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        isHidden: e.isHidden,
        syncedAt: now,
      })),
    }),
  ])

  return rows.length
}

// ---------------------------------------------------------------------------
// Sync: UserOds (via adapter, full refresh)
// ---------------------------------------------------------------------------

async function syncUserOds(
  prisma: PrismaClient,
  adapter: PmsAdapter,
): Promise<number> {
  const rows = await adapter.getUserMappings()
  if (rows.length === 0) return 0

  const now = new Date()

  await prisma.$transaction([
    prisma.userOd.deleteMany(),
    prisma.userOd.createMany({
      data: rows.map((u) => ({
        userNum: u.userNum,
        userName: u.userName,
        employeeNum: u.employeeNum,
        providerNum: u.providerNum,
        isHidden: u.isHidden,
        syncedAt: now,
      })),
    }),
  ])

  return rows.length
}

// ---------------------------------------------------------------------------
// Sync: ClockEvents (rolling 7-day window)
// ---------------------------------------------------------------------------

async function syncClockEvents(
  prisma: PrismaClient,
  adapter: PmsAdapter,
): Promise<number> {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 7)

  const rows = await adapter.getClockEvents(
    formatDateParam(start),
    formatDateParam(end),
  )

  if (rows.length === 0) return 0

  const now = new Date()

  for (const ce of rows) {
    await prisma.clockEvent.upsert({
      where: { id: ce.id },
      create: {
        id: ce.id,
        employeeId: ce.employeeId,
        timeIn: ce.timeIn,
        timeOut: ce.timeOut,
        clockStatus: ce.clockStatus,
        isWorkingHome: ce.isWorkingHome,
        overtimeHours: ce.overtimeHours,
        note: ce.note,
        syncedAt: now,
      },
      update: {
        employeeId: ce.employeeId,
        timeIn: ce.timeIn,
        timeOut: ce.timeOut,
        clockStatus: ce.clockStatus,
        isWorkingHome: ce.isWorkingHome,
        overtimeHours: ce.overtimeHours,
        note: ce.note,
        syncedAt: now,
      },
    })
  }

  return rows.length
}

// ---------------------------------------------------------------------------
// Sync: SecurityLogs (incremental via lastSync)
// ---------------------------------------------------------------------------

async function syncSecurityLogs(
  prisma: PrismaClient,
  adapter: PmsAdapter,
): Promise<number> {
  const lastSync = await getLastSyncStamp(prisma, "securitylogs")

  const rows = await adapter.getAuditLogs(lastSync)

  if (rows.length === 0) return 0

  // Build userNum -> employeeNum map from local UserOd table
  const userOds = await prisma.userOd.findMany({
    select: { userNum: true, userName: true, employeeNum: true },
  })
  const userMap = new Map(
    userOds.map((u) => [
      u.userNum,
      { userName: u.userName, employeeNum: u.employeeNum },
    ]),
  )

  const now = new Date()

  for (const row of rows) {
    const mapped = userMap.get(row.userNum)

    await prisma.securityLog.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        permType: row.permType,
        userNum: row.userNum,
        userName: mapped?.userName ?? row.userName ?? null,
        employeeId: mapped?.employeeNum ?? null,
        logDateTime: row.logDateTime,
        logText: row.logText,
        patNum: row.patNum,
        compName: row.compName,
        logSource: row.logSource,
        source: row.source,
        syncedAt: now,
      },
      update: {
        permType: row.permType,
        userNum: row.userNum,
        userName: mapped?.userName ?? row.userName ?? null,
        employeeId: mapped?.employeeNum ?? null,
        logDateTime: row.logDateTime,
        logText: row.logText,
        patNum: row.patNum,
        compName: row.compName,
        logSource: row.logSource,
        source: row.source,
        syncedAt: now,
      },
    })
  }

  return rows.length
}

// ---------------------------------------------------------------------------
// Sync: Appointments (incremental via lastSync)
// ---------------------------------------------------------------------------

async function syncAppointments(
  prisma: PrismaClient,
  adapter: PmsAdapter,
): Promise<number> {
  const lastSync = await getLastSyncStamp(prisma, "appointments")

  const rows = await adapter.getAppointments(lastSync)

  if (rows.length === 0) return 0

  const now = new Date()

  for (const apt of rows) {
    await prisma.appointment.upsert({
      where: { id: apt.id },
      create: {
        id: apt.id,
        patNum: apt.patNum,
        aptStatus: apt.aptStatus,
        aptDateTime: apt.aptDateTime,
        provNum: apt.provNum,
        confirmedStatus: apt.confirmedStatus,
        note: apt.note,
        dateTimeArrived: apt.dateTimeArrived,
        dateTimeSeated: apt.dateTimeSeated,
        dateTimeDismissed: apt.dateTimeDismissed,
        syncedAt: now,
      },
      update: {
        patNum: apt.patNum,
        aptStatus: apt.aptStatus,
        aptDateTime: apt.aptDateTime,
        provNum: apt.provNum,
        confirmedStatus: apt.confirmedStatus,
        note: apt.note,
        dateTimeArrived: apt.dateTimeArrived,
        dateTimeSeated: apt.dateTimeSeated,
        dateTimeDismissed: apt.dateTimeDismissed,
        syncedAt: now,
      },
    })
  }

  return rows.length
}

// ---------------------------------------------------------------------------
// Sync: Claims (incremental via lastSync)
// ---------------------------------------------------------------------------

async function syncClaims(
  prisma: PrismaClient,
  adapter: PmsAdapter,
): Promise<number> {
  const lastSync = await getLastSyncStamp(prisma, "claims")

  const rows = await adapter.getClaims(lastSync)

  if (rows.length === 0) return 0

  const now = new Date()

  for (const cl of rows) {
    await prisma.claim.upsert({
      where: { id: cl.id },
      create: {
        id: cl.id,
        patNum: cl.patNum,
        claimStatus: cl.claimStatus,
        dateSent: cl.dateSent,
        dateReceived: cl.dateReceived,
        claimFee: cl.claimFee,
        insPayAmt: cl.insPayAmt,
        provNum: cl.provNum,
        syncedAt: now,
      },
      update: {
        patNum: cl.patNum,
        claimStatus: cl.claimStatus,
        dateSent: cl.dateSent,
        dateReceived: cl.dateReceived,
        claimFee: cl.claimFee,
        insPayAmt: cl.insPayAmt,
        provNum: cl.provNum,
        syncedAt: now,
      },
    })
  }

  return rows.length
}

// ---------------------------------------------------------------------------
// Sync: ProcedureLogs (incremental via lastSync)
// ---------------------------------------------------------------------------

async function syncProcedureLogs(
  prisma: PrismaClient,
  adapter: PmsAdapter,
): Promise<number> {
  const lastSync = await getLastSyncStamp(prisma, "procedurelogs")

  const rows = await adapter.getProcedureLogs(lastSync)

  if (rows.length === 0) return 0

  const now = new Date()

  for (const pl of rows) {
    await prisma.procedureLog.upsert({
      where: { id: pl.id },
      create: {
        id: pl.id,
        patNum: pl.patNum,
        provNum: pl.provNum,
        procDate: pl.procDate,
        procStatus: pl.procStatus,
        procCode: pl.procCode,
        procFee: pl.procFee,
        description: pl.description,
        syncedAt: now,
      },
      update: {
        patNum: pl.patNum,
        provNum: pl.provNum,
        procDate: pl.procDate,
        procStatus: pl.procStatus,
        procCode: pl.procCode,
        procFee: pl.procFee,
        description: pl.description,
        syncedAt: now,
      },
    })
  }

  return rows.length
}

// ---------------------------------------------------------------------------
// Sync: Providers (full refresh)
// ---------------------------------------------------------------------------

async function syncProviders(
  prisma: PrismaClient,
  adapter: PmsAdapter,
): Promise<number> {
  const rows = await adapter.getProviders()
  if (rows.length === 0) return 0

  const now = new Date()

  await prisma.$transaction([
    prisma.provider.deleteMany(),
    prisma.provider.createMany({
      data: rows.map((p) => ({
        id: p.id,
        abbr: p.abbr,
        firstName: p.firstName,
        lastName: p.lastName,
        isHidden: p.isHidden,
        syncedAt: now,
      })),
    }),
  ])

  return rows.length
}

// ---------------------------------------------------------------------------
// Sync: Schedules (rolling 14-day window, full replace)
// ---------------------------------------------------------------------------

async function syncSchedules(
  prisma: PrismaClient,
  adapter: PmsAdapter,
): Promise<number> {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 14)

  const rows = await adapter.getSchedules(
    formatDateParam(start),
    formatDateParam(end),
  )

  const now = new Date()

  await prisma.$transaction([
    prisma.schedule.deleteMany({
      where: {
        schedDate: { gte: start, lte: end },
      },
    }),
    prisma.schedule.createMany({
      data: rows.map((s) => ({
        id: s.id,
        employeeNum: s.employeeNum,
        provNum: s.provNum,
        schedDate: s.schedDate,
        startTime: s.startTime,
        stopTime: s.stopTime,
        schedType: s.schedType,
        note: s.note,
        syncedAt: now,
      })),
    }),
  ])

  return rows.length
}

// ---------------------------------------------------------------------------
// Sync: InsVerifications (incremental via lastSync)
// ---------------------------------------------------------------------------

async function syncInsVerifications(
  prisma: PrismaClient,
  adapter: PmsAdapter,
): Promise<number> {
  const lastSync = await getLastSyncStamp(prisma, "insverifications")

  const rows = await adapter.getInsVerifications(lastSync)

  if (rows.length === 0) return 0

  const now = new Date()

  for (const iv of rows) {
    await prisma.insVerification.upsert({
      where: { id: iv.id },
      create: {
        id: iv.id,
        patNum: iv.patNum,
        insSubNum: iv.insSubNum,
        appointmentNum: iv.appointmentNum,
        verifyType: iv.verifyType,
        dateLastVerified: iv.dateLastVerified,
        dateTimeEntry: iv.dateTimeEntry,
        defNum: iv.defNum,
        note: iv.note,
        assignedTo: iv.assignedTo,
        syncedAt: now,
      },
      update: {
        patNum: iv.patNum,
        insSubNum: iv.insSubNum,
        appointmentNum: iv.appointmentNum,
        verifyType: iv.verifyType,
        dateLastVerified: iv.dateLastVerified,
        dateTimeEntry: iv.dateTimeEntry,
        defNum: iv.defNum,
        note: iv.note,
        assignedTo: iv.assignedTo,
        syncedAt: now,
      },
    })
  }

  return rows.length
}

// ---------------------------------------------------------------------------
// Sync All: orchestrator
// ---------------------------------------------------------------------------

interface SyncResult {
  endpoint: string
  itemsSynced: number
  status: "ok" | "error"
  error?: string
}

export async function syncAll(
  prisma: PrismaClient,
  adapter: PmsAdapter,
): Promise<SyncResult[]> {
  if (syncRunning) {
    return [
      {
        endpoint: "all",
        itemsSynced: 0,
        status: "error",
        error: "Sync already in progress",
      },
    ]
  }

  syncRunning = true
  const results: SyncResult[] = []

  const endpoints: {
    name: string
    fn: (prisma: PrismaClient, adapter: PmsAdapter) => Promise<number>
  }[] = [
    { name: "employees", fn: syncEmployees },
    { name: "userods", fn: syncUserOds },
    { name: "clockevents", fn: syncClockEvents },
    { name: "securitylogs", fn: syncSecurityLogs },
    { name: "appointments", fn: syncAppointments },
    { name: "claims", fn: syncClaims },
    { name: "procedurelogs", fn: syncProcedureLogs },
    { name: "providers", fn: syncProviders },
    { name: "schedules", fn: syncSchedules },
    { name: "insverifications", fn: syncInsVerifications },
  ]

  try {
    for (const ep of endpoints) {
      try {
        const count = await ep.fn(prisma, adapter)
        await updateSyncState(prisma, ep.name, count, "ok")
        results.push({ endpoint: ep.name, itemsSynced: count, status: "ok" })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown sync error"
        await updateSyncState(prisma, ep.name, 0, "error", message)
        results.push({
          endpoint: ep.name,
          itemsSynced: 0,
          status: "error",
          error: message,
        })
        // Continue to next endpoint -- don't let one failure block others
      }
    }

    // Update the office-level lastSyncAt timestamp
    await prisma.officeSetting
      .update({
        where: { id: "default" },
        data: { lastSyncAt: new Date() },
      })
      .catch(() => {
        // Office setting may not exist yet; that's okay
      })
  } finally {
    syncRunning = false
  }

  return results
}

/**
 * Check if a sync is currently running.
 */
export function isSyncRunning(): boolean {
  return syncRunning
}
