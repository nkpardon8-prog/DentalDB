"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, parseISO } from "date-fns"
import {
  DollarSign,
  Activity,
  TrendingUp,
} from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface ProviderProduction {
  provNum: number
  provName: string
  total: number
  count: number
}

interface DayProduction {
  date: string
  total: number
}

interface ProductionResponse {
  total: number
  procedureCount: number
  byProvider: ProviderProduction[]
  byDay: DayProduction[]
}

type Period = "today" | "week" | "month"

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 w-28 rounded-lg bg-gray-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-gray-200" />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-gray-200" />
      <div className="h-64 rounded-xl bg-gray-200" />
    </div>
  )
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatCurrencyPrecise(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export default function ProductionPage() {
  const [period, setPeriod] = useState<Period>("today")

  const { data, isLoading } = useQuery<ProductionResponse>({
    queryKey: ["production", period],
    queryFn: async () => {
      const res = await fetch(`/api/production?period=${period}`)
      if (!res.ok) throw new Error("Failed to fetch production data")
      return res.json()
    },
    refetchInterval: 60_000,
  })

  if (isLoading) return <LoadingSkeleton />

  const total = data?.total ?? 0
  const procedureCount = data?.procedureCount ?? 0
  const avgPerProcedure = procedureCount > 0 ? total / procedureCount : 0

  const chartData = (data?.byDay ?? []).map((d) => ({
    ...d,
    label: format(parseISO(d.date), "MMM d"),
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Production</h1>
      </div>

      {/* Period selector */}
      <div className="flex gap-2">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              period === p
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Production"
          value={formatCurrency(total)}
          icon={DollarSign}
        />
        <StatCard
          title="Procedures Completed"
          value={procedureCount}
          icon={Activity}
        />
        <StatCard
          title="Avg Per Procedure"
          value={formatCurrencyPrecise(avgPerProcedure)}
          icon={TrendingUp}
        />
      </div>

      {/* Line chart */}
      {period !== "today" && chartData.length > 1 && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Production by Day
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value) => [
                  formatCurrencyPrecise(Number(value)),
                  "Production",
                ]}
                labelFormatter={(label) => label}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Single-day summary (when chart is not shown) */}
      {(period === "today" || chartData.length <= 1) && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">
            {period === "today" ? "Today's" : "Period"} Production
          </h2>
          <p className="text-4xl font-bold text-blue-600">
            {formatCurrencyPrecise(total)}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            from {procedureCount} completed procedure{procedureCount !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Provider breakdown table */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Provider Breakdown
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Provider Name</th>
                <th className="px-6 py-3 text-right">Production Total</th>
                <th className="px-6 py-3 text-right">Procedure Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.byProvider.map((prov) => (
                <tr key={prov.provNum} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">
                    {prov.provName}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-600">
                    {formatCurrencyPrecise(prov.total)}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-600">
                    {prov.count}
                  </td>
                </tr>
              ))}
              {(!data?.byProvider || data.byProvider.length === 0) && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    No production data for this period.
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
