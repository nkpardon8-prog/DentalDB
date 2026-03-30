// =============================================================================
// PMS Adapter Interface & Normalized Types
// =============================================================================
// These types match the shape expected by the Prisma upserts in sync.ts.
// Each PMS adapter maps vendor-specific responses into these normalized types.
// =============================================================================

export interface NormalizedEmployee {
  id: number
  firstName: string
  lastName: string
  isHidden: boolean
}

export interface NormalizedProvider {
  id: number
  abbr: string
  firstName: string
  lastName: string
  isHidden: boolean
}

export interface NormalizedUserMapping {
  userNum: number
  userName: string
  employeeNum: number | null
  providerNum: number | null
  isHidden: boolean
}

export interface NormalizedClockEvent {
  id: number
  employeeId: number
  timeIn: Date
  timeOut: Date | null
  clockStatus: string
  isWorkingHome: boolean
  overtimeHours: number
  note: string | null
}

export interface NormalizedAuditLog {
  id: number
  permType: string
  userNum: number
  userName: string | null
  logDateTime: Date
  logText: string
  patNum: number | null
  compName: string | null
  logSource: string | null
  source: "direct" | "inferred"
}

export interface NormalizedAppointment {
  id: number
  patNum: number
  aptStatus: string
  aptDateTime: Date
  provNum: number | null
  confirmedStatus: number | null
  note: string | null
  dateTimeArrived: Date | null
  dateTimeSeated: Date | null
  dateTimeDismissed: Date | null
}

export interface NormalizedClaim {
  id: number
  patNum: number
  claimStatus: string
  dateSent: Date | null
  dateReceived: Date | null
  claimFee: number
  insPayAmt: number
  provNum: number | null
}

export interface NormalizedProcedureLog {
  id: number
  patNum: number
  provNum: number
  procDate: Date
  procStatus: string
  procCode: string
  procFee: number
  description: string | null
}

export interface NormalizedSchedule {
  id: number
  employeeNum: number | null
  provNum: number | null
  schedDate: Date
  startTime: string // "HH:MM"
  stopTime: string // "HH:MM"
  schedType: number
  note: string | null
}

export interface NormalizedInsVerification {
  id: number
  patNum: number
  insSubNum: number | null
  appointmentNum: number | null
  verifyType: string
  dateLastVerified: Date | null
  dateTimeEntry: Date | null
  defNum: number | null
  note: string | null
  assignedTo: number | null
}

export interface PmsAdapter {
  getEmployees(): Promise<NormalizedEmployee[]>
  getProviders(): Promise<NormalizedProvider[]>
  getUserMappings(): Promise<NormalizedUserMapping[]>
  getClockEvents(dateStart: string, dateEnd: string): Promise<NormalizedClockEvent[]>
  getAuditLogs(since: Date): Promise<NormalizedAuditLog[]>
  getAppointments(since: Date): Promise<NormalizedAppointment[]>
  getClaims(since: Date): Promise<NormalizedClaim[]>
  getProcedureLogs(since: Date): Promise<NormalizedProcedureLog[]>
  getSchedules(dateStart: string, dateEnd: string): Promise<NormalizedSchedule[]>
  getInsVerifications(since: Date): Promise<NormalizedInsVerification[]>
  testConnection(): Promise<boolean>
  close?(): Promise<void>
}
