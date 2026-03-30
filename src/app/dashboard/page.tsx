"use client"

import { useDashboardOverview } from "@/hooks/use-dashboard-data"
import { StatCard } from "@/components/dashboard/stat-card"
import { ActivityFeed, type ActivityItem } from "@/components/dashboard/activity-feed"
import { EmployeeStatusBadge } from "@/components/dashboard/employee-status-badge"
import { GoalProgress } from "@/components/dashboard/goal-progress"
import { Users, CalendarCheck, FileText, DollarSign, AlertTriangle } from "lucide-react"
import Link from "next/link"

const permTypeLabels: Record<string, { action: string; type: ActivityItem["type"] }> = {
  AppointmentCreate: { action: "Created appointment", type: "appointment" },
  AppointmentEdit: { action: "Edited appointment", type: "appointment" },
  AppointmentDelete: { action: "Deleted appointment", type: "appointment" },
  AppointmentCompleteEdit: { action: "Completed appointment", type: "appointment" },
  ClaimSentEdit: { action: "Sent claim", type: "claim" },
  ClaimEdit: { action: "Edited claim", type: "claim" },
  ClaimDelete: { action: "Deleted claim", type: "claim" },
  PatientCreate: { action: "Created patient", type: "patient" },
  PatientEdit: { action: "Edited patient", type: "patient" },
  SecurityLogIn: { action: "Logged in", type: "login" },
  SecurityLogOff: { action: "Logged off", type: "login" },
  ClockIn: { action: "Clocked in", type: "clock" },
  ClockOut: { action: "Clocked out", type: "clock" },
  ProcCompleteCreate: { action: "Completed procedure", type: "other" },
  ProcCompleteEdit: { action: "Edited completed procedure", type: "other" },
}

function getReadableAction(permType: string): { action: string; type: ActivityItem["type"] } {
  if (permTypeLabels[permType]) return permTypeLabels[permType]
  // Fallback: convert camelCase/PascalCase to readable text
  const readable = permType.replace(/([A-Z])/g, " $1").trim()
  return { action: readable, type: "other" }
}

function timeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

interface ClockEvent {
  id: number
  employeeId: number
  timeIn: string
  timeOut: string | null
  clockStatus: string
  isWorkingHome: boolean
  employee: { id: number; firstName: string; lastName: string }
}

interface SecurityLogEntry {
  id: number
  permType: string
  userName: string | null
  employeeId: number | null
  logDateTime: string
  logText: string
  employee: { id: number; firstName: string; lastName: string } | null
}

function deriveEmployeeStatus(clockEvents: ClockEvent[]) {
  // Build a map: employeeId -> their latest clock event
  const latestByEmployee = new Map<
    number,
    { status: "online" | "break" | "lunch" | "offline"; isRemote: boolean; lastActive: string; name: string }
  >()

  for (const event of clockEvents) {
    const existing = latestByEmployee.get(event.employeeId)
    // clockEvents come sorted desc by timeIn, so first occurrence is latest
    if (!existing) {
      let status: "online" | "break" | "lunch" | "offline" = "offline"
      if (!event.timeOut) {
        if (event.clockStatus === "Break") status = "break"
        else if (event.clockStatus === "Lunch") status = "lunch"
        else status = "online"
      }
      latestByEmployee.set(event.employeeId, {
        status,
        isRemote: event.isWorkingHome,
        lastActive: event.timeOut ?? event.timeIn,
        name: `${event.employee.firstName} ${event.employee.lastName}`,
      })
    }
  }

  return Array.from(latestByEmployee.entries()).map(([id, data]) => ({
    id,
    ...data,
  }))
}

const statusOrder: Record<string, number> = {
  online: 0,
  break: 1,
  lunch: 2,
  offline: 3,
}

const avatarColorsByStatus: Record<string, string> = {
  online: "bg-indigo-100 text-indigo-700",
  break: "bg-amber-100 text-amber-700",
  lunch: "bg-emerald-100 text-emerald-700",
  offline: "bg-gray-100 text-gray-500",
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="h-3 w-20 rounded bg-gray-100" />
      <div className="mt-3 h-7 w-14 rounded bg-gray-100" />
      <div className="mt-2 h-3 w-28 rounded bg-gray-100" />
    </div>
  )
}

function SkeletonList() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <div className="h-8 w-8 rounded-full bg-gray-100" />
          <div className="flex-1">
            <div className="h-4 w-48 rounded bg-gray-100" />
            <div className="mt-1 h-3 w-32 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboardOverview()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonList />
          <SkeletonList />
        </div>
      </div>
    )
  }

  const activities: ActivityItem[] = (data?.recentLogs ?? []).map(
    (log: SecurityLogEntry) => {
      const { action, type } = getReadableAction(log.permType)
      const name =
        log.employee
          ? `${log.employee.firstName} ${log.employee.lastName}`
          : log.userName ?? "System"

      return {
        id: String(log.id),
        userName: name,
        action,
        detail: log.logText,
        time: timeAgo(log.logDateTime),
        type,
      }
    }
  )

  const employeeStatuses = deriveEmployeeStatus(data?.todayClockEvents ?? [])
    .sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9))

  const productionFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(data?.productionTotal ?? 0)

  return (
    <div className="page-enter space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Users Online"
          value={`${data?.onlineCount ?? 0} / ${data?.totalEmployees ?? 0}`}
          subtitle="Active employees"
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Appointments"
          value={data?.completedAppointments ?? 0}
          subtitle="Completed today"
          icon={CalendarCheck}
          color="emerald"
        />
        <StatCard
          title="Claims Sent"
          value={data?.claimsSent ?? 0}
          subtitle="Sent today"
          icon={FileText}
          color="amber"
        />
        <StatCard
          title="Production"
          value={productionFormatted}
          subtitle="Today's total"
          icon={DollarSign}
          color="rose"
        />
      </div>

      {/* Goal progress + alert banner */}
      {(data?.goalProgress || (data?.alertCount ?? 0) > 0) && (
        <div className="space-y-4">
          {data?.goalProgress && (
            <div className="rounded-2xl border border-gray-100 border-l-4 border-l-indigo-400 bg-white p-5 shadow-sm">
              <GoalProgress
                title="Today's Production Goal"
                current={data.goalProgress.actual}
                target={data.goalProgress.target}
                format="currency"
              />
            </div>
          )}
          {(data?.alertCount ?? 0) > 0 && (
            <Link
              href="/dashboard/alerts"
              className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-sm text-amber-800 transition-colors hover:bg-amber-100"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">
                {data?.alertCount} alert{data?.alertCount === 1 ? "" : "s"}
              </span>
              <span className="text-xs text-amber-600">&rarr;</span>
            </Link>
          )}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
              Recent Activity
            </h2>
            <Link
              href="/dashboard/activity"
              className="text-xs font-medium text-indigo-500 transition-colors hover:text-indigo-700"
            >
              View All
            </Link>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            {activities.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                No recent activity
              </div>
            ) : (
              <ul>
                {activities.map((activity, idx) => (
                  <li
                    key={activity.id}
                    className={`flex items-center justify-between px-5 py-3.5 ${
                      idx % 2 === 1 ? "bg-gray-50/50" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.userName}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {activity.action}
                        {activity.detail ? ` \u2014 ${activity.detail}` : ""}
                      </p>
                    </div>
                    <span className="ml-4 shrink-0 text-xs text-gray-400">
                      {activity.time}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Team Status */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
              Team Status
            </h2>
          </div>
          <div className="max-h-96 overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
            <ul>
              {employeeStatuses.length === 0 && (
                <li className="px-5 py-8 text-center text-sm text-gray-400">
                  No clock activity today
                </li>
              )}
              {employeeStatuses.map((emp, idx) => (
                <li
                  key={emp.id}
                  className={`flex items-center justify-between px-5 py-3.5 ${
                    idx % 2 === 1 ? "bg-gray-50/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        avatarColorsByStatus[emp.status] ?? "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {emp.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {emp.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {timeAgo(emp.lastActive)}
                    </span>
                    <EmployeeStatusBadge
                      status={emp.status}
                      isRemote={emp.isRemote}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
