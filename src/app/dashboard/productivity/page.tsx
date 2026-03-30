"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Trophy, Users, BarChart3 } from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"
import { ProductivityChart } from "@/components/dashboard/productivity-chart"

interface EmployeeProductivity {
  id: number
  name: string
  claims: number
  appointments: number
  procedures: number
  hours: number
  production: number
}

interface ProductivityResponse {
  employees: EmployeeProductivity[]
}

type Period = "today" | "week" | "month"
type Metric = "all" | "claims" | "appointments" | "procedures" | "hours"

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
}

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: "all", label: "All Metrics" },
  { value: "claims", label: "Claims" },
  { value: "appointments", label: "Appointments" },
  { value: "procedures", label: "Procedures" },
  { value: "hours", label: "Hours Worked" },
]

function getMetricValue(employee: EmployeeProductivity, metric: Metric): number {
  switch (metric) {
    case "claims":
      return employee.claims
    case "appointments":
      return employee.appointments
    case "procedures":
      return employee.procedures
    case "hours":
      return employee.hours
    default:
      return 0
  }
}

function getMetricLabel(metric: Metric): string {
  switch (metric) {
    case "claims":
      return "Claims"
    case "appointments":
      return "Appointments"
    case "procedures":
      return "Procedures"
    case "hours":
      return "Hours"
    default:
      return ""
  }
}

function formatMetricValue(value: number, metric: Metric): string {
  if (metric === "hours") {
    return `${value.toFixed(1)}h`
  }
  return String(value)
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

export default function ProductivityPage() {
  const [period, setPeriod] = useState<Period>("today")
  const [metric, setMetric] = useState<Metric>("all")

  const { data, isLoading } = useQuery<ProductivityResponse>({
    queryKey: ["productivity", period, metric],
    queryFn: async () => {
      const res = await fetch(
        `/api/productivity?period=${period}&metric=${metric}`
      )
      if (!res.ok) throw new Error("Failed to fetch productivity data")
      return res.json()
    },
    refetchInterval: 60_000,
  })

  if (isLoading) return <LoadingSkeleton />

  const employees = data?.employees ?? []

  // Sort by selected metric (or by total activity for "all")
  const sorted = [...employees].sort((a, b) => {
    if (metric === "all") {
      const totalA = a.claims + a.appointments + a.procedures
      const totalB = b.claims + b.appointments + b.procedures
      return totalB - totalA
    }
    return getMetricValue(b, metric) - getMetricValue(a, metric)
  })

  // Calculate stat card values
  const topPerformer = sorted.length > 0 ? sorted[0].name : "N/A"

  let totalValue = 0
  let avgValue = 0

  if (metric === "all") {
    totalValue = employees.reduce(
      (sum, e) => sum + e.claims + e.appointments + e.procedures,
      0
    )
  } else {
    totalValue = employees.reduce(
      (sum, e) => sum + getMetricValue(e, metric),
      0
    )
  }
  avgValue =
    employees.length > 0
      ? Math.round((totalValue / employees.length) * 10) / 10
      : 0

  // Prepare chart data for single metric view
  const chartData =
    metric !== "all"
      ? sorted.map((e) => ({
          name: e.name,
          value: getMetricValue(e, metric),
        }))
      : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900">
        Productivity Comparison
      </h1>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
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

        {/* Metric selector */}
        <div>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as Metric)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {METRIC_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Top Performer"
          value={topPerformer}
          icon={Trophy}
        />
        <StatCard
          title="Team Average"
          value={
            metric === "hours"
              ? `${avgValue.toFixed(1)}h`
              : String(avgValue)
          }
          icon={Users}
        />
        <StatCard
          title={
            metric === "all"
              ? "Total Actions"
              : `Total ${getMetricLabel(metric)}`
          }
          value={
            metric === "hours"
              ? `${totalValue.toFixed(1)}h`
              : String(totalValue)
          }
          icon={BarChart3}
        />
      </div>

      {/* Chart (single metric only) */}
      {metric !== "all" && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {getMetricLabel(metric)} by Employee
          </h2>
          <ProductivityChart
            data={chartData}
            metric={getMetricLabel(metric)}
          />
        </div>
      )}

      {/* Data table */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {metric === "all"
              ? "All Metrics"
              : `${getMetricLabel(metric)} Breakdown`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3 w-12">#</th>
                <th className="px-6 py-3">Employee</th>
                {metric === "all" ? (
                  <>
                    <th className="px-6 py-3 text-right">Claims</th>
                    <th className="px-6 py-3 text-right">Appointments</th>
                    <th className="px-6 py-3 text-right">Procedures</th>
                    <th className="px-6 py-3 text-right">Hours</th>
                    <th className="px-6 py-3 text-right">Production</th>
                  </>
                ) : (
                  <th className="px-6 py-3 text-right">
                    {getMetricLabel(metric)}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((employee, index) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-500 font-medium">
                    {index + 1}
                  </td>
                  <td className="px-6 py-3 font-medium text-gray-900">
                    {employee.name}
                    {index === 0 && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        Top
                      </span>
                    )}
                  </td>
                  {metric === "all" ? (
                    <>
                      <td className="px-6 py-3 text-right text-gray-600">
                        {employee.claims}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-600">
                        {employee.appointments}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-600">
                        {employee.procedures}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-600">
                        {employee.hours.toFixed(1)}h
                      </td>
                      <td className="px-6 py-3 text-right text-gray-600">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(employee.production)}
                      </td>
                    </>
                  ) : (
                    <td className="px-6 py-3 text-right text-gray-600">
                      {formatMetricValue(
                        getMetricValue(employee, metric),
                        metric
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={metric === "all" ? 7 : 3}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    No productivity data for this period.
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
