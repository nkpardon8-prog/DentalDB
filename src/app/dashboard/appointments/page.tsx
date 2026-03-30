"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import {
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"

interface Appointment {
  id: number
  patNum: number
  aptStatus: string
  aptDateTime: string
  provNum: number | null
  confirmedStatus: number | null
  note: string | null
  dateTimeArrived: string | null
  dateTimeSeated: string | null
  dateTimeDismissed: string | null
}

interface ProviderBreakdown {
  provNum: number
  provName: string
  count: number
}

interface AppointmentsResponse {
  appointments: Appointment[]
  summary: {
    total: number
    scheduled: number
    complete: number
    broken: number
    noShow: number
  }
  byProvider: ProviderBreakdown[]
}

const STATUS_COLORS: Record<string, string> = {
  Complete: "bg-green-100 text-green-800",
  Scheduled: "bg-blue-100 text-blue-800",
  Broken: "bg-red-100 text-red-800",
  "Broken/Missed": "bg-red-100 text-red-800",
  NoShow: "bg-red-100 text-red-800",
  Unconfirmed: "bg-yellow-100 text-yellow-800",
}

const CHART_COLORS: Record<string, string> = {
  Complete: "#22c55e",
  Scheduled: "#3b82f6",
  Broken: "#ef4444",
  NoShow: "#f97316",
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-48 rounded bg-gray-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-gray-200" />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-gray-200" />
      <div className="h-64 rounded-xl bg-gray-200" />
    </div>
  )
}

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  )

  const { data, isLoading } = useQuery<AppointmentsResponse>({
    queryKey: ["appointments", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/appointments?date=${selectedDate}`)
      if (!res.ok) throw new Error("Failed to fetch appointments")
      return res.json()
    },
    refetchInterval: 60_000,
  })

  if (isLoading) return <LoadingSkeleton />

  const summary = data?.summary ?? {
    total: 0,
    scheduled: 0,
    complete: 0,
    broken: 0,
    noShow: 0,
  }

  const chartData = [
    { status: "Complete", count: summary.complete, fill: CHART_COLORS.Complete },
    { status: "Scheduled", count: summary.scheduled, fill: CHART_COLORS.Scheduled },
    { status: "Broken", count: summary.broken, fill: CHART_COLORS.Broken },
    { status: "No-Show", count: summary.noShow, fill: CHART_COLORS.NoShow },
  ]

  return (
    <div className="space-y-6">
      {/* Header with date picker */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Appointments"
          value={summary.total}
          icon={Calendar}
        />
        <StatCard
          title="Completed"
          value={summary.complete}
          icon={CheckCircle2}
        />
        <StatCard
          title="Scheduled"
          value={summary.scheduled}
          icon={Clock}
        />
        <StatCard
          title="Broken / No-Show"
          value={summary.broken + summary.noShow}
          icon={XCircle}
        />
      </div>

      {/* Status breakdown bar chart */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Status Breakdown
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" name="Appointments" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Appointments table */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Appointment Details
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Patient ID</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Provider</th>
                <th className="px-6 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.appointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-3 font-medium text-gray-900">
                    {format(new Date(apt.aptDateTime), "h:mm a")}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{apt.patNum}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[apt.aptStatus] ??
                        "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {apt.aptStatus}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-600">
                    {data.byProvider.find((p) => p.provNum === apt.provNum)
                      ?.provName ?? (apt.provNum ? `#${apt.provNum}` : "-")}
                  </td>
                  <td className="px-6 py-3 text-gray-500 max-w-xs truncate">
                    {apt.note ?? "-"}
                  </td>
                </tr>
              ))}
              {(!data?.appointments || data.appointments.length === 0) && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    No appointments for this date.
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
