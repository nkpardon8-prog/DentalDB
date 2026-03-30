// =============================================================================
// Open Dental REST API Response Types
// =============================================================================

export interface ODEmployee {
  EmployeeNum: number
  FName: string
  LName: string
  IsHidden: string // "true" or "false"
}

export interface ODClockEvent {
  ClockEventNum: number
  EmployeeNum: number
  TimeDisplayed1: string // clock in
  TimeDisplayed2: string // clock out (empty if still clocked in)
  ClockStatus: string // "Home", "Lunch", "Break"
  IsWorkingHome: string // "true" or "false"
  OTimeHours: string
  Note: string
}

export interface ODAppointment {
  AptNum: number
  PatNum: number
  AptStatus: string
  AptDateTime: string
  ProvNum: number
  Confirmed: number
  Note: string
  DateTimeArrived: string
  DateTimeSeated: string
  DateTimeDismissed: string
}

export interface ODClaim {
  ClaimNum: number
  PatNum: number
  ClaimStatus: string
  DateSent: string
  DateReceived: string
  ClaimFee: string
  InsPayAmt: string
  ProvTreat: number
}

export interface ODProcedureLog {
  ProcNum: number
  PatNum: number
  ProvNum: number
  ProcDate: string
  ProcStatus: string
  CodeNum: number
  ProcFee: string
  Descript: string
}

export interface ODProvider {
  ProvNum: number
  Abbr: string
  FName: string
  LName: string
  IsHidden: string
}

// =============================================================================
// SQL Query Row Types (from PUT /queries/ShortQuery)
// All fields come back as strings from the Queries API
// =============================================================================

export interface ODSecurityLogRow {
  SecurityLogNum: string
  PermType: string
  UserNum: string
  UserName: string
  LogDateTime: string
  LogText: string
  PatNum: string
  CompName: string
  FKey: string
  LogSource: string
}

export interface ODUserOdRow {
  UserNum: string
  UserName: string
  EmployeeNum: string
  ProvNum: string
  IsHidden: string
}
