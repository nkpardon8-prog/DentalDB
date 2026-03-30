"use client"

import { useState, useRef, useEffect } from "react"
import { Bell, X, AlertTriangle, Clock, FileX, UserX, Info } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"

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

function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical":
      return "text-red-500"
    case "warning":
      return "text-amber-500"
    case "info":
      return "text-blue-500"
    default:
      return "text-gray-500"
  }
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

export function AlertBell() {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data } = useQuery<{ alerts: AlertItem[] }>({
    queryKey: ["alerts", "undismissed"],
    queryFn: async () => {
      const res = await fetch("/api/alerts?dismissed=false")
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
      if (!res.ok) throw new Error("Failed to dismiss alert")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] })
    },
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const alerts = data?.alerts ?? []
  const displayAlerts = alerts.slice(0, 10)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-50"
        aria-label="Alerts"
      >
        <Bell className="h-4 w-4" />
        {alerts.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {alerts.length > 99 ? "99+" : alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Alerts</h3>
            <span className="text-xs text-gray-500">
              {alerts.length} active
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {displayAlerts.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No active alerts
              </div>
            ) : (
              displayAlerts.map((alert) => {
                const Icon = getAlertIcon(alert.type)
                const colorClass = getSeverityColor(alert.severity)

                return (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 border-b border-gray-50 px-4 py-3 last:border-b-0"
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${colorClass}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {alert.title}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {alert.message}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {timeAgo(alert.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        dismissMutation.mutate(alert.id)
                      }}
                      className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      aria-label="Dismiss alert"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          <div className="border-t border-gray-100 px-4 py-2">
            <Link
              href="/dashboard/alerts"
              className="block text-center text-xs font-medium text-blue-600 hover:text-blue-700"
              onClick={() => setOpen(false)}
            >
              View All
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
