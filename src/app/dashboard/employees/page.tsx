"use client"

import { useState } from "react"
import Link from "next/link"
import { useEmployees } from "@/hooks/use-dashboard-data"
import { EmployeeStatusBadge } from "@/components/dashboard/employee-status-badge"
import { Search } from "lucide-react"

interface EmployeeRow {
  id: number
  firstName: string
  lastName: string
  status: "online" | "break" | "lunch" | "offline"
  isRemote: boolean
  lastActivity: string | null
  actionsToday: number
  clockInTime: string | null
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

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function SkeletonTable() {
  return (
    <div className="animate-pulse rounded-xl bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="h-5 w-32 rounded bg-gray-200" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-gray-50 px-6 py-4">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-4 w-12 rounded bg-gray-200" />
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  )
}

export default function EmployeesPage() {
  const { data, isLoading } = useEmployees()
  const [search, setSearch] = useState("")

  const employees: EmployeeRow[] = data ?? []
  const filtered = employees.filter((emp) => {
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase()
    return fullName.includes(search.toLowerCase())
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <SkeletonTable />
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Actions Today
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Clock In Time
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Remote
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((emp) => (
                <tr
                  key={emp.id}
                  className="transition-colors hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/employees/${emp.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {emp.firstName} {emp.lastName}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <EmployeeStatusBadge status={emp.status} isRemote={false} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {emp.lastActivity ? timeAgo(emp.lastActivity) : "Never"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {emp.actionsToday}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {emp.clockInTime ? formatTime(emp.clockInTime) : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {emp.isRemote ? (
                      <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                        Yes
                      </span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    {search ? "No employees match your search" : "No employees found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
