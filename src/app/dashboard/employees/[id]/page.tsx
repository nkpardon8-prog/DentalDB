"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useEmployee } from "@/hooks/use-dashboard-data"
import { StatCard } from "@/components/dashboard/stat-card"
import { EmployeeStatusBadge } from "@/components/dashboard/employee-status-badge"
import {
  ArrowLeft,
  Clock,
  Activity,
  CalendarCheck,
  FileText,
} from "lucide-react"

interface ClockEvent {
  id: number
  timeIn: string
  timeOut: string | null
  clockStatus: string
  isWorkingHome: boolean
  note: string | null
}

interface LogEntry {
  id: number
  permType: string
  logDateTime: string
  logText: string
  compName: string | null
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
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

const statusColors: Record<string, string> = {
  Home: "bg-green-500",
  Break: "bg-yellow-500",
  Lunch: "bg-orange-500",
}

function SkeletonDetail() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded bg-gray-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white p-6 shadow-sm">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="mt-3 h-8 w-16 rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="h-5 w-32 rounded bg-gray-200" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded bg-gray-100" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function EmployeeDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { data, isLoading } = useEmployee(id)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/employees"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Employees
        </Link>
      </div>

      {isLoading || !data ? (
        <SkeletonDetail />
      ) : (
        <>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {data.firstName} {data.lastName}
            </h1>
            <EmployeeStatusBadge status={data.status} isRemote={data.isRemote} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Hours Today"
              value={data.hoursToday}
              subtitle="Working hours"
              icon={Clock}
            />
            <StatCard
              title="Actions Today"
              value={data.actionsToday}
              subtitle="Security log entries"
              icon={Activity}
            />
            <StatCard
              title="Appointments"
              value={data.appointmentsToday}
              subtitle="Today"
              icon={CalendarCheck}
            />
            <StatCard
              title="Claims"
              value={data.claimsToday}
              subtitle="Today"
              icon={FileText}
            />
          </div>

          {/* Clock Event Timeline */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Today&apos;s Timeline
            </h2>
            {data.todayClockEvents.length === 0 ? (
              <p className="text-sm text-gray-500">No clock events today</p>
            ) : (
              <div className="relative space-y-0">
                {/* Vertical line */}
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />

                {[...data.todayClockEvents]
                  .sort(
                    (a: ClockEvent, b: ClockEvent) =>
                      new Date(a.timeIn).getTime() - new Date(b.timeIn).getTime()
                  )
                  .map((event: ClockEvent) => {
                    const dotColor =
                      statusColors[event.clockStatus] ?? "bg-gray-400"
                    return (
                      <div key={event.id} className="relative flex gap-4 py-3">
                        <div
                          className={`relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full ${dotColor} ring-4 ring-white`}
                          style={{ marginLeft: "10px" }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {event.clockStatus}
                            </span>
                            {event.isWorkingHome && (
                              <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                                Remote
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {formatTime(event.timeIn)}
                            {event.timeOut
                              ? ` - ${formatTime(event.timeOut)}`
                              : " - Present"}
                          </p>
                          {event.note && (
                            <p className="mt-0.5 text-xs text-gray-400">
                              {event.note}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>

          {/* Recent Activity Table */}
          <div className="rounded-xl bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Activity
              </h2>
            </div>
            {data.recentLogs.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-500">
                No recent activity
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Time
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Action
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Details
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Computer
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.recentLogs.map((log: LogEntry) => (
                      <tr key={log.id}>
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-500">
                          {timeAgo(log.logDateTime)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3">
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                            {log.permType}
                          </span>
                        </td>
                        <td className="max-w-xs truncate px-6 py-3 text-sm text-gray-500">
                          {log.logText}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-400">
                          {log.compName ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
