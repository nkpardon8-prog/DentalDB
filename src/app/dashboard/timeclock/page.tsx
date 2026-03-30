"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Clock,
  Users,
  Timer,
  AlertTriangle,
  Home,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { formatTime, hoursAndMinutes } from "@/lib/utils"

async function fetchTimeclock(date: string) {
  const res = await fetch(`/api/timeclock?date=${encodeURIComponent(date)}`)
  if (!res.ok) throw new Error("Failed to fetch timeclock data")
  return res.json()
}

function todayString() {
  const d = new Date()
  return d.toLocaleDateString("en-CA") // yyyy-mm-dd
}

interface EmployeeSummary {
  employeeId: number
  employeeName: string
  totalHours: number
  overtimeHours: number
  isRemote: boolean
  clockedIn: boolean
  currentStatus: string
}

interface ClockEventRow {
  id: number
  employeeId: number
  timeIn: string
  timeOut: string | null
  clockStatus: string
  isWorkingHome: boolean
  overtimeHours: number
  note: string | null
  employee: {
    id: number
    firstName: string
    lastName: string
  }
}

export default function TimeclockPage() {
  const [date, setDate] = useState(todayString)
  const [dataSource, setDataSource] = useState("opendental")

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(data => {
      if (data.settings?.dataSource) setDataSource(data.settings.dataSource)
    })
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ["timeclock", date],
    queryFn: () => fetchTimeclock(date),
    refetchInterval: 60_000,
  })

  const summary: EmployeeSummary[] = data?.summary ?? []
  const clockEvents: ClockEventRow[] = data?.clockEvents ?? []

  const stats = useMemo(() => {
    const clockedIn = summary.filter((e) => e.clockedIn).length
    const totalHours = summary.reduce((acc, e) => acc + e.totalHours, 0)
    const overtimeHours = summary.reduce((acc, e) => acc + e.overtimeHours, 0)
    const remoteWorkers = summary.filter((e) => e.isRemote).length
    return { clockedIn, totalHours, overtimeHours, remoteWorkers }
  }, [summary])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-teal-50 p-2">
            <Clock className="h-6 w-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Time Clock</h1>
            <p className="text-sm text-gray-500">
              Employee clock-in and hours overview
            </p>
          </div>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* PMS clock event banner */}
      {(dataSource === "eaglesoft" || dataSource === "dentrix") && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            Clock events are not available for {dataSource === "eaglesoft" ? "Eaglesoft" : "Dentrix"}.
            This feature requires Open Dental&apos;s time clock module.
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Staff Clocked In"
          value={isLoading ? "-" : String(stats.clockedIn)}
          icon={Users}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <SummaryCard
          title="Total Hours Today"
          value={isLoading ? "-" : hoursAndMinutes(stats.totalHours)}
          icon={Timer}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <SummaryCard
          title="Overtime Hours"
          value={isLoading ? "-" : hoursAndMinutes(stats.overtimeHours)}
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
        <SummaryCard
          title="Remote Workers"
          value={isLoading ? "-" : String(stats.remoteWorkers)}
          icon={Home}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      {/* Clock events table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-500">
                  Employee
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-500">
                  Status
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-500">
                  Clock In
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-500">
                  Clock Out
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-500">
                  Hours
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-500">
                  Remote
                </th>
                <th className="px-4 py-3 font-medium text-gray-500">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                        </td>
                      ))}
                    </tr>
                  ))
                : clockEvents.map((event) => {
                    const isClockedIn = event.timeOut === null
                    const timeIn = new Date(event.timeIn)
                    const timeOut = event.timeOut
                      ? new Date(event.timeOut)
                      : new Date()
                    const hours =
                      (timeOut.getTime() - timeIn.getTime()) /
                      (1000 * 60 * 60)
                    const hasOvertime = event.overtimeHours > 0

                    return (
                      <tr
                        key={event.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                          {event.employee.firstName} {event.employee.lastName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {isClockedIn ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              {event.clockStatus}
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                              Clocked Out
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {formatTime(event.timeIn)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {event.timeOut ? formatTime(event.timeOut) : "-"}
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-3 font-medium ${
                            hasOvertime ? "text-red-600" : "text-gray-900"
                          }`}
                        >
                          {hoursAndMinutes(hours)}
                          {hasOvertime && (
                            <span className="ml-1 text-xs text-red-500">
                              (OT: {hoursAndMinutes(event.overtimeHours)})
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {event.isWorkingHome ? (
                            <span className="inline-flex items-center gap-1 text-purple-600">
                              <Home className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">Yes</span>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No</span>
                          )}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-gray-500">
                          {event.note ?? "-"}
                        </td>
                      </tr>
                    )
                  })}
              {!isLoading && clockEvents.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No clock events found for this date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-full p-3 ${iconBg}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  )
}
