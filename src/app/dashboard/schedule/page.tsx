"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import {
  Clock,
  CalendarCheck,
  AlertTriangle,
  LogOut,
} from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"

interface Comparison {
  employeeId: number
  employeeName: string
  scheduledStart: string | null
  scheduledEnd: string | null
  actualStart: string | null
  actualEnd: string | null
  lateMinutes: number
  earlyMinutes: number
  flags: string[]
  scheduledHours: number
  actualHours: number
}

interface ScheduleCompareResponse {
  comparisons: Comparison[]
  summary: {
    totalScheduledHours: number
    totalActualHours: number
    lateCount: number
    earlyOutCount: number
    absentCount: number
  }
}

function formatTimeDisplay(isoStr: string | null): string {
  if (!isoStr) return "-"
  return format(new Date(isoStr), "h:mm a")
}

function getLateColor(minutes: number): string {
  if (minutes <= 0) return "text-green-600"
  if (minutes <= 15) return "text-yellow-600"
  return "text-red-600"
}

function getLateLabel(minutes: number): string {
  if (minutes <= 0) return "On Time"
  return `${minutes} min`
}

function getEarlyColor(minutes: number): string {
  if (minutes <= 0) return "text-green-600"
  return "text-orange-600"
}

function getEarlyLabel(minutes: number): string {
  if (minutes <= 0) return "Full Shift"
  return `${minutes} min early`
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-48 rounded-lg bg-gray-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-gray-200" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-gray-200" />
    </div>
  )
}

export default function ScheduleComparePage() {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"))

  const { data, isLoading } = useQuery<ScheduleCompareResponse>({
    queryKey: ["schedule-compare", date],
    queryFn: async () => {
      const res = await fetch(`/api/schedule-compare?date=${date}`)
      if (!res.ok) throw new Error("Failed to fetch schedule comparison")
      return res.json()
    },
    refetchInterval: 60_000,
  })

  if (isLoading) return <LoadingSkeleton />

  const comparisons = data?.comparisons ?? []
  const summary = data?.summary ?? {
    totalScheduledHours: 0,
    totalActualHours: 0,
    lateCount: 0,
    earlyOutCount: 0,
    absentCount: 0,
  }

  const presentEmployees = comparisons.filter(
    (c) => !c.flags.includes("absent")
  )
  const absentEmployees = comparisons.filter((c) =>
    c.flags.includes("absent")
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900">
        Schedule vs Actual
      </h1>

      {/* Date picker */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Scheduled Hours"
          value={`${summary.totalScheduledHours.toFixed(1)}h`}
          icon={CalendarCheck}
        />
        <StatCard
          title="Actual Hours"
          value={`${summary.totalActualHours.toFixed(1)}h`}
          icon={Clock}
        />
        <StatCard
          title="Late Arrivals"
          value={summary.lateCount}
          icon={AlertTriangle}
          subtitle={
            summary.lateCount > 0
              ? `${summary.lateCount} employee${summary.lateCount !== 1 ? "s" : ""} late`
              : "All on time"
          }
        />
        <StatCard
          title="Early Departures"
          value={summary.earlyOutCount}
          icon={LogOut}
          subtitle={
            summary.earlyOutCount > 0
              ? `${summary.earlyOutCount} left early`
              : "All full shifts"
          }
        />
      </div>

      {/* Main comparison table */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Attendance Details
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Employee</th>
                <th className="px-6 py-3">Scheduled Start</th>
                <th className="px-6 py-3">Actual Clock-in</th>
                <th className="px-6 py-3">Late By</th>
                <th className="px-6 py-3">Scheduled End</th>
                <th className="px-6 py-3">Actual Clock-out</th>
                <th className="px-6 py-3">Early By</th>
                <th className="px-6 py-3 text-right">Hours Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {presentEmployees.map((comp) => {
                const hoursDiff =
                  Math.round((comp.actualHours - comp.scheduledHours) * 10) / 10

                return (
                  <tr key={comp.employeeId} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-3 font-medium text-gray-900">
                      {comp.employeeName}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {formatTimeDisplay(comp.scheduledStart)}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {formatTimeDisplay(comp.actualStart)}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`font-medium ${getLateColor(comp.lateMinutes)}`}
                      >
                        {getLateLabel(comp.lateMinutes)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {formatTimeDisplay(comp.scheduledEnd)}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {comp.actualEnd
                        ? formatTimeDisplay(comp.actualEnd)
                        : "Still working"}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`font-medium ${getEarlyColor(comp.earlyMinutes)}`}
                      >
                        {comp.actualEnd
                          ? getEarlyLabel(comp.earlyMinutes)
                          : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span
                        className={`font-medium ${
                          hoursDiff >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {hoursDiff >= 0 ? "+" : ""}
                        {hoursDiff.toFixed(1)}h
                      </span>
                    </td>
                  </tr>
                )
              })}

              {/* Absent employees */}
              {absentEmployees.map((comp) => (
                <tr
                  key={comp.employeeId}
                  className="bg-red-50 hover:bg-red-100"
                >
                  <td className="whitespace-nowrap px-6 py-3 font-medium text-red-900">
                    {comp.employeeName}
                  </td>
                  <td className="px-6 py-3 text-red-600">
                    {formatTimeDisplay(comp.scheduledStart)}
                  </td>
                  <td
                    colSpan={6}
                    className="px-6 py-3 text-red-700 font-medium"
                  >
                    No clock-in (Absent)
                  </td>
                </tr>
              ))}

              {comparisons.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    No schedule data for this date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary footer */}
      {comparisons.length > 0 && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Day Summary
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Scheduled
              </p>
              <p className="text-xl font-bold text-gray-900">
                {summary.totalScheduledHours.toFixed(1)}h
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Actual
              </p>
              <p className="text-xl font-bold text-gray-900">
                {summary.totalActualHours.toFixed(1)}h
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Late
              </p>
              <p
                className={`text-xl font-bold ${
                  summary.lateCount > 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {summary.lateCount}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Early Out
              </p>
              <p
                className={`text-xl font-bold ${
                  summary.earlyOutCount > 0
                    ? "text-orange-600"
                    : "text-green-600"
                }`}
              >
                {summary.earlyOutCount}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Absent
              </p>
              <p
                className={`text-xl font-bold ${
                  summary.absentCount > 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {summary.absentCount}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
