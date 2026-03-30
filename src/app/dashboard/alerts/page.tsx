"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Clock,
  FileX,
  UserX,
  Info,
  X,
  Filter,
} from "lucide-react"

interface AlertItem {
  id: string
  type: string
  severity: string
  title: string
  message: string
  employeeId: number | null
  dismissed: boolean
  autoResolved: boolean
  createdAt: string
  employee: { id: number; firstName: string; lastName: string } | null
}

const ALERT_TYPES = [
  { value: "all", label: "All Types" },
  { value: "late_clockin", label: "Late Clock-in" },
  { value: "long_break", label: "Long Break" },
  { value: "claim_rejected", label: "Claim Rejected" },
  { value: "no_show", label: "No-Show" },
]

const SEVERITIES = [
  { value: "all", label: "All Severities" },
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
]

function getAlertIcon(type: string) {
  switch (type) {
    case "late_clockin":
      return Clock
    case "long_break":
      return Clock
    case "claim_rejected":
      return FileX
    case "no_show":
      return UserX
    default:
      return Info
  }
}

function getTypeBadgeColor(type: string) {
  switch (type) {
    case "late_clockin":
      return "bg-orange-100 text-orange-700"
    case "long_break":
      return "bg-amber-100 text-amber-700"
    case "claim_rejected":
      return "bg-red-100 text-red-700"
    case "no_show":
      return "bg-purple-100 text-purple-700"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

function getSeverityBadgeColor(severity: string) {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-700"
    case "warning":
      return "bg-amber-100 text-amber-700"
    case "info":
      return "bg-blue-100 text-blue-700"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

function formatTypeLabel(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function formatTime(dateString: string): string {
  const d = new Date(dateString)
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export default function AlertsPage() {
  const [typeFilter, setTypeFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState("all")
  const [showDismissed, setShowDismissed] = useState(false)
  const queryClient = useQueryClient()

  const queryParams = new URLSearchParams()
  if (!showDismissed) queryParams.set("dismissed", "false")
  if (typeFilter !== "all") queryParams.set("type", typeFilter)

  const { data, isLoading } = useQuery<{ alerts: AlertItem[] }>({
    queryKey: ["alerts", typeFilter, severityFilter, showDismissed],
    queryFn: async () => {
      const res = await fetch(`/api/alerts?${queryParams.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch alerts")
      return res.json()
    },
    refetchInterval: 60_000,
  })

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error("Failed to dismiss")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] })
    },
  })

  const dismissAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissAll: true }),
      })
      if (!res.ok) throw new Error("Failed to dismiss all")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] })
    },
  })

  // Client-side severity filter (API filters by type; severity filtered here)
  const alerts = (data?.alerts ?? []).filter((a) => {
    if (severityFilter !== "all" && a.severity !== severityFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
        <button
          onClick={() => dismissAllMutation.mutate()}
          disabled={dismissAllMutation.isPending || alerts.length === 0}
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
        >
          Dismiss All
        </button>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
        <Filter className="h-4 w-4 text-gray-400" />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
        >
          {ALERT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
        >
          {SEVERITIES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showDismissed}
            onChange={(e) => setShowDismissed(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show Dismissed
        </label>
      </div>

      {/* Alerts table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <div className="animate-pulse p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="mb-4 flex items-center gap-4">
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="h-4 w-16 rounded bg-gray-200" />
                <div className="flex-1" />
                <div className="h-4 w-48 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No alerts to display.
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Severity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Message
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alerts.map((alert) => {
                const Icon = getAlertIcon(alert.type)
                return (
                  <tr
                    key={alert.id}
                    className={alert.dismissed || alert.autoResolved ? "opacity-50" : ""}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                      {formatTime(alert.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getTypeBadgeColor(alert.type)}`}
                      >
                        <Icon className="h-3 w-3" />
                        {formatTypeLabel(alert.type)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getSeverityBadgeColor(alert.severity)}`}
                      >
                        {alert.severity}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {alert.employee
                        ? `${alert.employee.firstName} ${alert.employee.lastName}`
                        : "-"}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-600">
                      {alert.message}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {!alert.dismissed && !alert.autoResolved && (
                        <button
                          onClick={() => dismissMutation.mutate(alert.id)}
                          disabled={dismissMutation.isPending}
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                          title="Dismiss"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      {alert.autoResolved && (
                        <span className="text-xs text-green-600">Auto-resolved</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
