"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"

interface Verification {
  id: number
  patNum: number
  insSubNum: number | null
  appointmentNum: number | null
  verifyType: string
  dateLastVerified: string | null
  dateTimeEntry: string | null
  defNum: number | null
  note: string | null
  assignedTo: number | null
  assignedToName: string | null
  status: "Verified" | "Pending" | "Overdue"
}

interface InsuranceResponse {
  verifications: Verification[]
  total: number
  summary: {
    totalPending: number
    verifiedToday: number
    overdue: number
  }
}

const STATUS_BADGE: Record<string, string> = {
  Verified: "bg-green-100 text-green-800",
  Pending: "bg-yellow-100 text-yellow-800",
  Overdue: "bg-red-100 text-red-800",
}

const STATUS_OPTIONS = ["All", "Pending", "Verified", "Overdue"]

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 rounded bg-gray-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-gray-200" />
        ))}
      </div>
      <div className="h-10 w-48 rounded bg-gray-200" />
      <div className="h-96 rounded-xl bg-gray-200" />
    </div>
  )
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-"
  return format(new Date(dateStr), "MM/dd/yyyy")
}

export default function InsurancePage() {
  const [statusFilter, setStatusFilter] = useState("All")
  const [page, setPage] = useState(1)
  const limit = 50

  const queryParams = new URLSearchParams()
  if (statusFilter !== "All") queryParams.set("status", statusFilter.toLowerCase())
  queryParams.set("page", String(page))
  queryParams.set("limit", String(limit))
  const queryString = queryParams.toString()

  const { data, isLoading } = useQuery<InsuranceResponse>({
    queryKey: ["insurance", statusFilter, page],
    queryFn: async () => {
      const res = await fetch(`/api/insurance?${queryString}`)
      if (!res.ok) throw new Error("Failed to fetch insurance verifications")
      return res.json()
    },
    refetchInterval: 60_000,
  })

  // Reset to page 1 when filter changes
  const handleFilterChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  if (isLoading) return <LoadingSkeleton />

  const summary = data?.summary ?? {
    totalPending: 0,
    verifiedToday: 0,
    overdue: 0,
  }
  const totalPages = Math.ceil((data?.total ?? 0) / limit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900">Insurance Verification Queue</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Pending"
          value={summary.totalPending}
          icon={Clock}
        />
        <StatCard
          title="Verified Today"
          value={summary.verifiedToday}
          icon={CheckCircle2}
        />
        <StatCard
          title="Overdue"
          value={summary.overdue}
          icon={AlertTriangle}
        />
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Verification Details
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Patient ID</th>
                <th className="px-6 py-3">Plan / Sub#</th>
                <th className="px-6 py-3">Appointment</th>
                <th className="px-6 py-3">Last Verified</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Assigned To</th>
                <th className="px-6 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.verifications.map((v) => (
                <tr
                  key={v.id}
                  className={
                    v.status === "Overdue"
                      ? "bg-red-50 hover:bg-red-100"
                      : "hover:bg-gray-50"
                  }
                >
                  <td className="whitespace-nowrap px-6 py-3 font-medium text-gray-900">
                    {v.patNum}
                  </td>
                  <td className="px-6 py-3 text-gray-600">
                    {v.verifyType} / {v.insSubNum ?? "-"}
                  </td>
                  <td className="px-6 py-3 text-gray-600">
                    {v.appointmentNum ?? "-"}
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {formatDate(v.dateLastVerified)}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_BADGE[v.status] ?? "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-600">
                    {v.assignedToName ?? (v.assignedTo ? `User #${v.assignedTo}` : "-")}
                  </td>
                  <td className="px-6 py-3 text-gray-500 max-w-xs truncate">
                    {v.note ?? "-"}
                  </td>
                </tr>
              ))}
              {(!data?.verifications || data.verifications.length === 0) && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    No insurance verifications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} ({data?.total ?? 0} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
