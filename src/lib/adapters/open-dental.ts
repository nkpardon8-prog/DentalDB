import mysql from "mysql2/promise"
import type { Pool } from "mysql2/promise"
import type {
  PmsAdapter,
  NormalizedEmployee,
  NormalizedProvider,
  NormalizedUserMapping,
  NormalizedClockEvent,
  NormalizedAuditLog,
  NormalizedAppointment,
  NormalizedClaim,
  NormalizedProcedureLog,
  NormalizedSchedule,
  NormalizedInsVerification,
} from "./types"

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function toNumber(val: unknown): number {
  if (typeof val === "number") return val
  const n = Number(val)
  return Number.isNaN(n) ? 0 : n
}

function toBool(val: unknown): boolean {
  if (typeof val === "boolean") return val
  if (typeof val === "number") return val === 1
  if (typeof val === "string") return val === "1" || val.toLowerCase() === "true"
  return false
}

function toDate(val: unknown): Date | null {
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? null : val
  }
  if (!val || val === "" || val === "0001-01-01T00:00:00") return null
  const d = new Date(val as string)
  return Number.isNaN(d.getTime()) ? null : d
}

function toDateRequired(val: unknown): Date {
  return toDate(val) ?? new Date(0)
}

// ---------------------------------------------------------------------------
// Open Dental Local MySQL Adapter
// ---------------------------------------------------------------------------

export class OpenDentalLocalAdapter implements PmsAdapter {
  private pool: Pool

  constructor(config: {
    host: string
    port: number
    user: string
    password: string
    database: string
  }) {
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 5,
    })
  }

  async getEmployees(): Promise<NormalizedEmployee[]> {
    const [rows] = await this.pool.query(
      "SELECT EmployeeNum, FName, LName, IsHidden FROM employee"
    )
    return (rows as any[]).map((r) => ({
      id: toNumber(r.EmployeeNum),
      firstName: r.FName ?? "",
      lastName: r.LName ?? "",
      isHidden: toBool(r.IsHidden),
    }))
  }

  async getProviders(): Promise<NormalizedProvider[]> {
    const [rows] = await this.pool.query(
      "SELECT ProvNum, Abbr, FName, LName, IsHidden FROM provider"
    )
    return (rows as any[]).map((r) => ({
      id: toNumber(r.ProvNum),
      abbr: r.Abbr ?? "",
      firstName: r.FName ?? "",
      lastName: r.LName ?? "",
      isHidden: toBool(r.IsHidden),
    }))
  }

  async getUserMappings(): Promise<NormalizedUserMapping[]> {
    const [rows] = await this.pool.query(
      "SELECT UserNum, UserName, EmployeeNum, ProvNum, IsHidden FROM userod"
    )
    return (rows as any[]).map((r) => ({
      userNum: toNumber(r.UserNum),
      userName: r.UserName ?? "",
      employeeNum: toNumber(r.EmployeeNum) || null,
      providerNum: toNumber(r.ProvNum) || null,
      isHidden: toBool(r.IsHidden),
    }))
  }

  async getClockEvents(
    dateStart: string,
    dateEnd: string
  ): Promise<NormalizedClockEvent[]> {
    const [rows] = await this.pool.query(
      `SELECT ClockEventNum, EmployeeNum, TimeDisplayed1, TimeDisplayed2,
              ClockStatus, IsWorkingHome, OTimeHours, Note
       FROM clockevent
       WHERE TimeDisplayed1 >= ? AND TimeDisplayed1 <= ?`,
      [dateStart, dateEnd]
    )
    return (rows as any[]).map((r) => ({
      id: toNumber(r.ClockEventNum),
      employeeId: toNumber(r.EmployeeNum),
      timeIn: toDateRequired(r.TimeDisplayed1),
      timeOut: toDate(r.TimeDisplayed2),
      clockStatus: r.ClockStatus ?? "",
      isWorkingHome: toBool(r.IsWorkingHome),
      overtimeHours: toNumber(r.OTimeHours),
      note: r.Note || null,
    }))
  }

  async getAuditLogs(since: Date): Promise<NormalizedAuditLog[]> {
    const sinceStr = since.toISOString().replace("T", " ").slice(0, 19)
    const [rows] = await this.pool.query(
      `SELECT sl.SecurityLogNum, sl.PermType, sl.UserNum, sl.LogDateTime,
              sl.LogText, sl.PatNum, sl.CompName, sl.FKey, sl.LogSource,
              u.UserName
       FROM securitylog sl
       LEFT JOIN userod u ON u.UserNum = sl.UserNum
       WHERE sl.LogDateTime > ?
       ORDER BY sl.LogDateTime`,
      [sinceStr]
    )
    return (rows as any[]).map((r) => ({
      id: toNumber(r.SecurityLogNum),
      permType: r.PermType ?? "",
      userNum: toNumber(r.UserNum),
      userName: r.UserName ?? null,
      logDateTime: toDateRequired(r.LogDateTime),
      logText: r.LogText ?? "",
      patNum: toNumber(r.PatNum) || null,
      compName: r.CompName || null,
      logSource: r.LogSource || null,
      source: "direct" as const,
    }))
  }

  async getAppointments(since: Date): Promise<NormalizedAppointment[]> {
    const sinceStr = since.toISOString().replace("T", " ").slice(0, 19)
    const [rows] = await this.pool.query(
      `SELECT AptNum, PatNum, AptStatus, AptDateTime, ProvNum, Confirmed,
              Note, DateTimeArrived, DateTimeSeated, DateTimeDismissed
       FROM appointment
       WHERE DateTStamp > ?`,
      [sinceStr]
    )
    return (rows as any[]).map((r) => ({
      id: toNumber(r.AptNum),
      patNum: toNumber(r.PatNum),
      aptStatus: r.AptStatus ?? "",
      aptDateTime: toDateRequired(r.AptDateTime),
      provNum: toNumber(r.ProvNum) || null,
      confirmedStatus: toNumber(r.Confirmed) || null,
      note: r.Note || null,
      dateTimeArrived: toDate(r.DateTimeArrived),
      dateTimeSeated: toDate(r.DateTimeSeated),
      dateTimeDismissed: toDate(r.DateTimeDismissed),
    }))
  }

  async getClaims(since: Date): Promise<NormalizedClaim[]> {
    const sinceStr = since.toISOString().replace("T", " ").slice(0, 19)
    const [rows] = await this.pool.query(
      `SELECT ClaimNum, PatNum, ClaimStatus, DateSent, DateReceived,
              ClaimFee, InsPayAmt, ProvTreat
       FROM claim
       WHERE SecDateTEdit > ?`,
      [sinceStr]
    )
    return (rows as any[]).map((r) => ({
      id: toNumber(r.ClaimNum),
      patNum: toNumber(r.PatNum),
      claimStatus: r.ClaimStatus ?? "",
      dateSent: toDate(r.DateSent),
      dateReceived: toDate(r.DateReceived),
      claimFee: toNumber(r.ClaimFee),
      insPayAmt: toNumber(r.InsPayAmt),
      provNum: toNumber(r.ProvTreat) || null,
    }))
  }

  async getProcedureLogs(since: Date): Promise<NormalizedProcedureLog[]> {
    const sinceStr = since.toISOString().replace("T", " ").slice(0, 19)
    const [rows] = await this.pool.query(
      `SELECT ProcNum, PatNum, ProvNum, ProcDate, ProcStatus,
              CodeNum, ProcFee, Descript
       FROM procedurelog
       WHERE DateTStamp > ?`,
      [sinceStr]
    )
    return (rows as any[]).map((r) => ({
      id: toNumber(r.ProcNum),
      patNum: toNumber(r.PatNum),
      provNum: toNumber(r.ProvNum),
      procDate: toDateRequired(r.ProcDate),
      procStatus: r.ProcStatus ?? "",
      procCode: String(r.CodeNum ?? ""),
      procFee: toNumber(r.ProcFee),
      description: r.Descript || null,
    }))
  }

  async getSchedules(
    dateStart: string,
    dateEnd: string
  ): Promise<NormalizedSchedule[]> {
    const [rows] = await this.pool.query(
      `SELECT ScheduleNum, EmployeeNum, ProvNum, SchedDate,
              TIME_FORMAT(StartTime, '%H:%i') as StartTime,
              TIME_FORMAT(StopTime, '%H:%i') as StopTime,
              SchedType, Note
       FROM schedule
       WHERE SchedDate >= ? AND SchedDate <= ?`,
      [dateStart, dateEnd]
    )
    return (rows as any[]).map((r) => ({
      id: toNumber(r.ScheduleNum),
      employeeNum: toNumber(r.EmployeeNum) || null,
      provNum: toNumber(r.ProvNum) || null,
      schedDate: toDateRequired(r.SchedDate),
      startTime: r.StartTime ?? "00:00",
      stopTime: r.StopTime ?? "00:00",
      schedType: toNumber(r.SchedType),
      note: r.Note || null,
    }))
  }

  async getInsVerifications(since: Date): Promise<NormalizedInsVerification[]> {
    const sinceStr = since.toISOString().replace("T", " ").slice(0, 19)
    const [rows] = await this.pool.query(
      `SELECT InsVerifyNum, PatNum, InsSubNum, AppointmentNum,
              VerifyType, DateLastVerified, DateTimeEntry,
              DefNum, Note, UserNum as AssignedTo
       FROM insverify
       WHERE DateTimeEntry > ?
       ORDER BY DateTimeEntry DESC`,
      [sinceStr]
    )
    return (rows as any[]).map((r) => ({
      id: toNumber(r.InsVerifyNum),
      patNum: toNumber(r.PatNum),
      insSubNum: toNumber(r.InsSubNum) || null,
      appointmentNum: toNumber(r.AppointmentNum) || null,
      verifyType: r.VerifyType ?? "",
      dateLastVerified: toDate(r.DateLastVerified),
      dateTimeEntry: toDate(r.DateTimeEntry),
      defNum: toNumber(r.DefNum) || null,
      note: r.Note || null,
      assignedTo: toNumber(r.AssignedTo) || null,
    }))
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1")
      return true
    } catch {
      return false
    }
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}
