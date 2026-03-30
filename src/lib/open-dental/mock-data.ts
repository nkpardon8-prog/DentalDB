import type { PrismaClient } from "@prisma/client"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function today(hours = 0, minutes = 0): Date {
  const d = new Date()
  d.setHours(hours, minutes, 0, 0)
  return d
}

function todayStr(hours: number, minutes: number): string {
  return today(hours, minutes).toISOString()
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ---------------------------------------------------------------------------
// Static seed data
// ---------------------------------------------------------------------------

const EMPLOYEES = [
  { id: 1, firstName: "Sarah", lastName: "Mitchell", isHidden: false },
  { id: 2, firstName: "James", lastName: "Rivera", isHidden: false },
  { id: 3, firstName: "Emily", lastName: "Chen", isHidden: false },
  { id: 4, firstName: "Michael", lastName: "Thompson", isHidden: false },
  { id: 5, firstName: "Jessica", lastName: "Patel", isHidden: false },
  { id: 6, firstName: "David", lastName: "Nguyen", isHidden: false },
  { id: 7, firstName: "Amanda", lastName: "Kowalski", isHidden: false },
  { id: 8, firstName: "Robert", lastName: "Garcia", isHidden: true },
]

const PROVIDERS = [
  { id: 1, abbr: "DrM", firstName: "Sarah", lastName: "Mitchell", isHidden: false },
  { id: 2, abbr: "DrR", firstName: "James", lastName: "Rivera", isHidden: false },
  { id: 3, abbr: "HygC", firstName: "Emily", lastName: "Chen", isHidden: false },
  { id: 4, abbr: "DrT", firstName: "Michael", lastName: "Thompson", isHidden: false },
  { id: 5, abbr: "HygP", firstName: "Jessica", lastName: "Patel", isHidden: false },
]

const USER_ODS = [
  { userNum: 1, userName: "smitchell", employeeNum: 1, providerNum: 1, isHidden: false },
  { userNum: 2, userName: "jrivera", employeeNum: 2, providerNum: 2, isHidden: false },
  { userNum: 3, userName: "echen", employeeNum: 3, providerNum: 3, isHidden: false },
  { userNum: 4, userName: "mthompson", employeeNum: 4, providerNum: 4, isHidden: false },
  { userNum: 5, userName: "jpatel", employeeNum: 5, providerNum: 5, isHidden: false },
  { userNum: 6, userName: "dnguyen", employeeNum: 6, providerNum: null, isHidden: false },
  { userNum: 7, userName: "akowalski", employeeNum: 7, providerNum: null, isHidden: false },
  { userNum: 8, userName: "rgarcia", employeeNum: 8, providerNum: null, isHidden: true },
]

// ---------------------------------------------------------------------------
// Clock events: mix of clocked-in, on-break, and not-yet-arrived
// ---------------------------------------------------------------------------

function buildClockEvents() {
  const now = new Date()
  return [
    // Clocked in, working
    { id: 101, employeeId: 1, timeIn: today(7, 45), timeOut: null, clockStatus: "Home", isWorkingHome: false, overtimeHours: 0, note: null },
    { id: 102, employeeId: 2, timeIn: today(7, 55), timeOut: null, clockStatus: "Home", isWorkingHome: false, overtimeHours: 0, note: null },
    { id: 103, employeeId: 3, timeIn: today(8, 0), timeOut: null, clockStatus: "Home", isWorkingHome: false, overtimeHours: 0, note: null },
    // On lunch
    { id: 104, employeeId: 4, timeIn: today(7, 50), timeOut: today(12, 0), clockStatus: "Lunch", isWorkingHome: false, overtimeHours: 0, note: "Lunch break" },
    // On break
    { id: 105, employeeId: 5, timeIn: today(8, 10), timeOut: today(10, 15), clockStatus: "Break", isWorkingHome: false, overtimeHours: 0, note: null },
    // Working from home
    { id: 106, employeeId: 6, timeIn: today(8, 30), timeOut: null, clockStatus: "Home", isWorkingHome: true, overtimeHours: 0, note: "WFH - billing" },
    // Already clocked out (early shift)
    { id: 107, employeeId: 7, timeIn: today(6, 0), timeOut: today(14, 0), clockStatus: "Home", isWorkingHome: false, overtimeHours: 0, note: null },
    // Completed morning shifts (for richer report data)
    { id: 108, employeeId: 1, timeIn: today(7, 0), timeOut: today(12, 0), clockStatus: "Home", isWorkingHome: false, overtimeHours: 0, note: "Morning shift" },
    { id: 109, employeeId: 2, timeIn: today(7, 30), timeOut: today(12, 30), clockStatus: "Home", isWorkingHome: false, overtimeHours: 0, note: null },
    { id: 110, employeeId: 3, timeIn: today(8, 0), timeOut: today(13, 0), clockStatus: "Home", isWorkingHome: false, overtimeHours: 0, note: null },
  ]
}

// ---------------------------------------------------------------------------
// Security logs: 50 entries for today
// ---------------------------------------------------------------------------

const PERM_TYPES = [
  "UserLogOnOff",
  "AppointmentCreate",
  "AppointmentEdit",
  "PatientEdit",
  "ClaimView",
  "ProcComplCreate",
  "RxCreate",
  "SecurityAdmin",
  "PatientPortal",
  "SheetEdit",
]

const LOG_TEMPLATES: Record<string, string[]> = {
  UserLogOnOff: [
    "User logged on from {comp}",
    "User logged off from {comp}",
  ],
  AppointmentCreate: [
    "Appointment created for PatNum {pat}",
    "New appointment scheduled for PatNum {pat}",
  ],
  AppointmentEdit: [
    "Appointment status changed to Complete for PatNum {pat}",
    "Appointment rescheduled for PatNum {pat}",
    "Appointment confirmed for PatNum {pat}",
  ],
  PatientEdit: [
    "Patient address updated for PatNum {pat}",
    "Insurance info changed for PatNum {pat}",
    "Phone number updated for PatNum {pat}",
  ],
  ClaimView: [
    "Claim viewed for PatNum {pat}",
    "Claim printed for PatNum {pat}",
  ],
  ProcComplCreate: [
    "Procedure completed D0120 for PatNum {pat}",
    "Procedure completed D1110 for PatNum {pat}",
    "Procedure completed D2750 for PatNum {pat}",
  ],
  RxCreate: [
    "Prescription created for PatNum {pat}: Amoxicillin 500mg",
    "Prescription created for PatNum {pat}: Ibuprofen 600mg",
  ],
  SecurityAdmin: [
    "User permissions updated",
    "Password reset for user",
  ],
  PatientPortal: [
    "Patient portal message sent to PatNum {pat}",
    "Patient portal form received from PatNum {pat}",
  ],
  SheetEdit: [
    "Consent form edited for PatNum {pat}",
    "Treatment plan sheet updated for PatNum {pat}",
  ],
}

const COMP_NAMES = ["FRONT-DESK-1", "FRONT-DESK-2", "OP1-PC", "OP2-PC", "OP3-PC", "BILLING-PC", "DR-OFFICE"]

function buildSecurityLogs() {
  const logs = []
  for (let i = 0; i < 50; i++) {
    const permType = pick(PERM_TYPES)
    const templateArr = LOG_TEMPLATES[permType]
    const template = pick(templateArr)
    const patNum = randomInt(1000, 9999)
    const comp = pick(COMP_NAMES)
    const logText = template.replace("{pat}", String(patNum)).replace("{comp}", comp)
    const hour = randomInt(7, 17)
    const minute = randomInt(0, 59)
    const userOd = pick(USER_ODS.filter((u) => !u.isHidden))

    logs.push({
      id: 5000 + i,
      permType,
      userNum: userOd.userNum,
      userName: userOd.userName,
      employeeId: userOd.employeeNum,
      logDateTime: today(hour, minute),
      logText,
      patNum: permType === "UserLogOnOff" || permType === "SecurityAdmin" ? null : patNum,
      compName: comp,
      logSource: "OpenDental",
    })
  }

  // Sort by time
  logs.sort((a, b) => a.logDateTime.getTime() - b.logDateTime.getTime())
  return logs
}

// ---------------------------------------------------------------------------
// Appointments: 15 for today
// ---------------------------------------------------------------------------

const APT_STATUSES = ["Scheduled", "Complete", "Broken", "UnschedList"]
const APT_NOTES = [
  "Periodic exam and cleaning",
  "Crown prep #14",
  "Filling #19 MOD",
  "Root canal #30",
  "New patient exam",
  "Emergency - tooth pain",
  "Whitening consultation",
  "Implant follow-up",
  "Sealants",
  "Extraction #1",
  "Denture adjustment",
  "Ortho check",
  "Perio maintenance",
  "Bridge prep",
  "Veneer consult",
]

function buildAppointments() {
  const appointments = []
  for (let i = 0; i < 15; i++) {
    const hour = 8 + Math.floor(i * 0.7)
    const minute = (i * 20) % 60
    const status = i < 5 ? "Complete" : i < 12 ? "Scheduled" : i === 12 ? "Broken" : "UnschedList"
    const provider = pick(PROVIDERS)
    const arrived = status === "Complete" ? today(hour, minute - 5) : status === "Scheduled" && i < 8 ? today(hour, minute) : null
    const seated = status === "Complete" ? today(hour, minute + 3) : null
    const dismissed = status === "Complete" ? today(hour + 1, minute) : null

    appointments.push({
      id: 2000 + i,
      patNum: randomInt(1000, 9999),
      aptStatus: status,
      aptDateTime: today(hour, Math.max(0, minute)),
      provNum: provider.id,
      confirmedStatus: status === "Complete" ? 19 : status === "Scheduled" ? pick([0, 19, 20]) : 0,
      note: APT_NOTES[i],
      dateTimeArrived: arrived,
      dateTimeSeated: seated,
      dateTimeDismissed: dismissed,
    })
  }
  return appointments
}

// ---------------------------------------------------------------------------
// Claims: 10 with mixed statuses
// ---------------------------------------------------------------------------

const CLAIM_STATUSES = ["S", "R", "W", "H", "I"]
const CLAIM_STATUS_LABELS: Record<string, string> = {
  S: "Sent",
  R: "Received",
  W: "WaitingToSend",
  H: "Hold",
  I: "Inactive",
}

function buildClaims() {
  const claims = []
  const daysAgo = (n: number) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    d.setHours(10, 0, 0, 0)
    return d
  }

  for (let i = 0; i < 10; i++) {
    const status = i < 3 ? "R" : i < 6 ? "S" : i < 8 ? "W" : "H"
    // First 4 claims sent today, rest in the past
    const sentDate = i < 4 ? daysAgo(0) : daysAgo(randomInt(1, 30))
    const receivedDate = status === "R" ? daysAgo(0) : null
    const fee = randomInt(150, 3500)
    const payAmt = status === "R" ? fee * (randomInt(40, 80) / 100) : 0

    claims.push({
      id: 3000 + i,
      patNum: randomInt(1000, 9999),
      claimStatus: status,
      dateSent: sentDate,
      dateReceived: receivedDate,
      claimFee: fee,
      insPayAmt: Math.round(payAmt * 100) / 100,
      provNum: pick(PROVIDERS).id,
    })
  }
  return claims
}

// ---------------------------------------------------------------------------
// Procedure logs: 20 entries
// ---------------------------------------------------------------------------

const PROC_CODES = [
  { code: "D0120", desc: "Periodic oral evaluation", fee: 65 },
  { code: "D0150", desc: "Comprehensive oral evaluation", fee: 95 },
  { code: "D0220", desc: "Intraoral periapical radiograph", fee: 35 },
  { code: "D0274", desc: "Bitewings - four radiographic images", fee: 72 },
  { code: "D1110", desc: "Prophylaxis - adult", fee: 115 },
  { code: "D1120", desc: "Prophylaxis - child", fee: 75 },
  { code: "D1351", desc: "Sealant - per tooth", fee: 55 },
  { code: "D2140", desc: "Amalgam - one surface, primary", fee: 195 },
  { code: "D2150", desc: "Amalgam - two surfaces, primary", fee: 240 },
  { code: "D2330", desc: "Resin composite - one surface, anterior", fee: 210 },
  { code: "D2391", desc: "Resin composite - one surface, posterior", fee: 225 },
  { code: "D2750", desc: "Crown - porcelain/ceramic", fee: 1250 },
  { code: "D3310", desc: "Endodontic therapy, anterior", fee: 850 },
  { code: "D4341", desc: "Periodontal scaling and root planing, per quadrant", fee: 275 },
  { code: "D5110", desc: "Complete denture - maxillary", fee: 1800 },
  { code: "D6010", desc: "Surgical placement of implant body", fee: 2200 },
  { code: "D7140", desc: "Extraction, erupted tooth", fee: 225 },
  { code: "D7210", desc: "Extraction, surgical", fee: 375 },
  { code: "D9110", desc: "Palliative treatment of dental pain", fee: 95 },
  { code: "D9230", desc: "Inhalation of nitrous oxide", fee: 65 },
]

const PROC_STATUSES = ["C", "TP", "EC", "R", "D"]

function buildProcedureLogs() {
  const logs = []
  for (let i = 0; i < 20; i++) {
    const proc = PROC_CODES[i]
    const status = i < 12 ? "C" : i < 16 ? "TP" : pick(["EC", "R", "D"])
    // First 8 procedures are today, rest spread over past 14 days
    const daysBack = i < 8 ? 0 : randomInt(1, 14)
    const procDate = new Date()
    procDate.setDate(procDate.getDate() - daysBack)
    procDate.setHours(8 + randomInt(0, 8), randomInt(0, 59), 0, 0)

    logs.push({
      id: 4000 + i,
      patNum: randomInt(1000, 9999),
      provNum: pick(PROVIDERS).id,
      procDate,
      procStatus: status,
      procCode: proc.code,
      procFee: proc.fee,
      description: proc.desc,
    })
  }
  return logs
}

// ---------------------------------------------------------------------------
// Schedules: 5 employee shifts for today
// ---------------------------------------------------------------------------

function buildSchedules() {
  const schedules = [
    { id: 6001, employeeNum: 1, provNum: 1, startTime: "08:00", stopTime: "17:00", schedType: 2, note: null },
    { id: 6002, employeeNum: 2, provNum: 2, startTime: "09:00", stopTime: "18:00", schedType: 2, note: null },
    { id: 6003, employeeNum: 3, provNum: 3, startTime: "07:30", stopTime: "16:30", schedType: 2, note: null },
    { id: 6004, employeeNum: 4, provNum: 4, startTime: "08:00", stopTime: "17:00", schedType: 2, note: "Half day possible" },
    { id: 6005, employeeNum: 5, provNum: 5, startTime: "10:00", stopTime: "19:00", schedType: 2, note: null },
  ]

  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)

  return schedules.map((s) => ({
    ...s,
    schedDate: todayDate,
  }))
}

// ---------------------------------------------------------------------------
// Alerts: 3 mock alerts
// ---------------------------------------------------------------------------

function buildAlerts() {
  return [
    {
      type: "late_clockin",
      severity: "warning",
      title: "Late Clock-in",
      message: "Jessica Patel was scheduled at 10:00 but has not clocked in.",
      employeeId: 5,
    },
    {
      type: "long_break",
      severity: "warning",
      title: "Long Break",
      message: "Michael Thompson has been on lunch for 45 minutes.",
      employeeId: 4,
    },
    {
      type: "no_show",
      severity: "warning",
      title: "Patient No-Show",
      message: "Appointment #2012 for patient #5432 was marked as broken (no-show).",
      employeeId: null,
    },
  ]
}

// ---------------------------------------------------------------------------
// Goals: 2 mock goals
// ---------------------------------------------------------------------------

function buildGoals() {
  return [
    { type: "production", period: "daily", target: 5000, employeeId: null },
    { type: "appointments", period: "weekly", target: 100, employeeId: null },
  ]
}

// ---------------------------------------------------------------------------
// Insurance verifications: 5 mock entries
// ---------------------------------------------------------------------------

function buildInsVerifications() {
  const now = new Date()
  const daysAgo = (n: number) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    d.setHours(10, 0, 0, 0)
    return d
  }

  return [
    { id: 7001, patNum: 1001, insSubNum: 100, appointmentNum: 2000, verifyType: "InsuranceBenefit", dateLastVerified: daysAgo(1), dateTimeEntry: daysAgo(1), defNum: 1, note: "Verified via phone", assignedTo: 1 },
    { id: 7002, patNum: 2002, insSubNum: 101, appointmentNum: 2001, verifyType: "PatientEnrollment", dateLastVerified: null, dateTimeEntry: daysAgo(0), defNum: 2, note: "Pending callback", assignedTo: 2 },
    { id: 7003, patNum: 3003, insSubNum: 102, appointmentNum: 2002, verifyType: "InsuranceBenefit", dateLastVerified: daysAgo(45), dateTimeEntry: daysAgo(3), defNum: 1, note: "Overdue - needs re-verification", assignedTo: 3 },
    { id: 7004, patNum: 4004, insSubNum: 103, appointmentNum: 2003, verifyType: "PatientEnrollment", dateLastVerified: daysAgo(2), dateTimeEntry: daysAgo(2), defNum: 3, note: null, assignedTo: 1 },
    { id: 7005, patNum: 5005, insSubNum: 104, appointmentNum: 2004, verifyType: "InsuranceBenefit", dateLastVerified: null, dateTimeEntry: daysAgo(0), defNum: 2, note: "New patient - awaiting response", assignedTo: null },
  ]
}

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

export async function seedMockData(prisma: PrismaClient): Promise<void> {
  const now = new Date()

  // Clear existing data first (order matters for FK constraints)
  await prisma.alert.deleteMany()
  await prisma.goal.deleteMany()
  await prisma.schedule.deleteMany()
  await prisma.insVerification.deleteMany()
  await prisma.securityLog.deleteMany()
  await prisma.clockEvent.deleteMany()
  await prisma.userOd.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.claim.deleteMany()
  await prisma.procedureLog.deleteMany()
  await prisma.provider.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.syncState.deleteMany()

  // Employees
  await prisma.employee.createMany({
    data: EMPLOYEES.map((e) => ({ ...e, syncedAt: now })),
  })

  // Providers
  await prisma.provider.createMany({
    data: PROVIDERS.map((p) => ({ ...p, syncedAt: now })),
  })

  // UserOds
  await prisma.userOd.createMany({
    data: USER_ODS.map((u) => ({ ...u, syncedAt: now })),
  })

  // Clock events
  const clockEvents = buildClockEvents()
  await prisma.clockEvent.createMany({
    data: clockEvents.map((ce) => ({ ...ce, syncedAt: now })),
  })

  // Security logs
  const securityLogs = buildSecurityLogs()
  await prisma.securityLog.createMany({
    data: securityLogs.map((sl) => ({ ...sl, syncedAt: now })),
  })

  // Appointments
  const appointments = buildAppointments()
  await prisma.appointment.createMany({
    data: appointments.map((a) => ({ ...a, syncedAt: now })),
  })

  // Claims
  const claims = buildClaims()
  await prisma.claim.createMany({
    data: claims.map((c) => ({ ...c, syncedAt: now })),
  })

  // Procedure logs
  const procedureLogs = buildProcedureLogs()
  await prisma.procedureLog.createMany({
    data: procedureLogs.map((pl) => ({ ...pl, syncedAt: now })),
  })

  // Schedules
  const schedules = buildSchedules()
  await prisma.schedule.createMany({
    data: schedules.map((s) => ({ ...s, syncedAt: now })),
  })

  // Alerts
  const alerts = buildAlerts()
  for (const alert of alerts) {
    await prisma.alert.create({ data: alert })
  }

  // Goals
  const goals = buildGoals()
  for (const goal of goals) {
    await prisma.goal.create({ data: goal })
  }

  // Insurance verifications
  const insVerifications = buildInsVerifications()
  await prisma.insVerification.createMany({
    data: insVerifications.map((iv) => ({ ...iv, syncedAt: now })),
  })

  // Sync state entries so the dashboard shows "last synced"
  const syncEntries = [
    "employees",
    "userods",
    "clockevents",
    "securitylogs",
    "appointments",
    "claims",
    "procedurelogs",
    "providers",
    "schedules",
    "insverifications",
  ]
  await prisma.syncState.createMany({
    data: syncEntries.map((endpoint) => ({
      endpoint,
      lastSyncStamp: now,
      lastRunAt: now,
      itemsSynced: 0,
      status: "mock",
    })),
  })

  // Set office to demo mode (MySQL fields use schema defaults)
  await prisma.officeSetting.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      officeName: "Demo Dental Office",
      dataMode: "demo",
      syncEnabled: false,
    },
    update: {
      dataMode: "demo",
      syncEnabled: false,
    },
  })

  console.log("[mock-data] Seeded mock data for development")
}

// ---------------------------------------------------------------------------
// Conditional loader: only seeds if the employees table is empty
// ---------------------------------------------------------------------------

export async function loadMockDataIfEmpty(
  prisma: PrismaClient,
): Promise<void> {
  const count = await prisma.employee.count()
  if (count === 0) {
    await seedMockData(prisma)
  }
}
