"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import {
  FileText,
  Send,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"

interface Claim {
  id: number
  patNum: number
  claimStatus: string
  dateSent: string | null
  dateReceived: string | null
  claimFee: number | null
  insPayAmt: number | null
  provNum: number | null
}

interface ClaimsResponse {
  claims: Claim[]
  summary: {
    total: number
    unsent: number
    sent: number
    waiting: number
    received: number
  }
  recentActivity: Claim[]
}

const STATUS_COLORS: Record<string, string> = {
  Unsent: "bg-gray-100 text-gray-800",
  Sent: "bg-blue-100 text-blue-800",
  WaitingToSend: "bg-yellow-100 text-yellow-800",
  Waiting: "bg-yellow-100 text-yellow-800",
  Received: "bg-green-100 text-green-800",
}

const PIPELINE_COLORS: Record<string, string> = {
  Unsent: "bg-gray-400",
  Sent: "bg-blue-500",
  Waiting: "bg-yellow-500",
  Received: "bg-green-500",
}

const STATUS_OPTIONS = ["All", "Unsent", "Sent", "Waiting", "Received"]

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex gap-4">
        <div className="h-10 w-36 rounded bg-gray-200" />
        <div className="h-10 w-36 rounded bg-gray-200" />
        <div className="h-10 w-36 rounded bg-gray-200" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-gray-200" />
        ))}
      </div>
      <div className="h-20 rounded-xl bg-gray-200" />
      <div className="h-64 rounded-xl bg-gray-200" />
    </div>
  )
}

function formatCurrency(amount: number | null | undefined) {
  if (amount == null) return "-"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-"
  return format(new Date(dateStr), "MM/dd/yyyy")
}

export default function ClaimsPage() {
  const [statusFilter, setStatusFilter] = useState("All")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const queryParams = new URLSearchParams()
  if (statusFilter !== "All") queryParams.set("status", statusFilter)
  if (dateFrom) queryParams.set("dateFrom", dateFrom)
  if (dateTo) queryParams.set("dateTo", dateTo)
  const queryString = queryParams.toString()

  const { data, isLoading } = useQuery<ClaimsResponse>({
    queryKey: ["claims", statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      const url = queryString ? `/api/claims?${queryString}` : "/api/claims"
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch claims")
      return res.json()
    },
    refetchInterval: 60_000,
  })

  if (isLoading) return <LoadingSkeleton />

  const summary = data?.summary ?? {
    total: 0,
    unsent: 0,
    sent: 0,
    waiting: 0,
    received: 0,
  }

  const pipelineTotal = summary.unsent + summary.sent + summary.waiting + summary.received
  const pipelineSegments = [
    { label: "Unsent", count: summary.unsent, color: PIPELINE_COLORS.Unsent },
    { label: "Sent", count: summary.sent, color: PIPELINE_COLORS.Sent },
    { label: "Waiting", count: summary.waiting, color: PIPELINE_COLORS.Waiting },
    { label: "Received", count: summary.received, color: PIPELINE_COLORS.Received },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900">Claims</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            From
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            To
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Unsent" value={summary.unsent} icon={FileText} />
        <StatCard title="Sent" value={summary.sent} icon={Send} />
        <StatCard title="Waiting" value={summary.waiting} icon={Clock} />
        <StatCard
          title="Received"
          value={summary.received}
          icon={CheckCircle2}
        />
      </div>

      {/* Pipeline visualization */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Claims Pipeline
        </h2>
        {pipelineTotal > 0 ? (
          <>
            <div className="flex h-10 overflow-hidden rounded-lg">
              {pipelineSegments.map((seg) =>
                seg.count > 0 ? (
                  <div
                    key={seg.label}
                    className={`${seg.color} flex items-center justify-center text-xs font-semibold text-white transition-all`}
                    style={{
                      width: `${(seg.count / pipelineTotal) * 100}%`,
                    }}
                  >
                    {seg.count}
                  </div>
                ) : null
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              {pipelineSegments.map((seg) => (
                <div key={seg.label} className="flex items-center gap-2 text-sm">
                  <span
                    className={`inline-block h-3 w-3 rounded-full ${seg.color}`}
                  />
                  <span className="text-gray-600">
                    {seg.label}: {seg.count}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-gray-400 text-sm">No claims data available.</p>
        )}
      </div>

      {/* Claims table */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Claims Details
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Claim ID</th>
                <th className="px-6 py-3">Patient ID</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Fee</th>
                <th className="px-6 py-3">Ins. Payment</th>
                <th className="px-6 py-3">Date Sent</th>
                <th className="px-6 py-3">Date Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.claims.map((claim) => (
                <tr key={claim.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-3 font-medium text-gray-900">
                    {claim.id}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{claim.patNum}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[claim.claimStatus] ??
                        "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {claim.claimStatus}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-600">
                    {formatCurrency(claim.claimFee)}
                  </td>
                  <td className="px-6 py-3 text-gray-600">
                    {formatCurrency(claim.insPayAmt)}
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {formatDate(claim.dateSent)}
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {formatDate(claim.dateReceived)}
                  </td>
                </tr>
              ))}
              {(!data?.claims || data.claims.length === 0) && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    No claims found.
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
