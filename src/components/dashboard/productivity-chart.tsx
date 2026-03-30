"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface ProductivityChartProps {
  data: { name: string; value: number }[]
  metric: string
  color?: string
}

export function ProductivityChart({
  data,
  metric,
  color = "#3b82f6",
}: ProductivityChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400 text-sm">
        No data available for this metric.
      </div>
    )
  }

  // Sort descending by value for ranking
  const sorted = [...data].sort((a, b) => b.value - a.value)

  // Calculate left margin based on longest employee name
  const maxNameLength = Math.max(...sorted.map((d) => d.name.length), 0)
  const leftMargin = Math.min(Math.max(maxNameLength * 7, 80), 200)

  return (
    <ResponsiveContainer width="100%" height={Math.max(sorted.length * 44, 200)}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 5, right: 30, left: leftMargin, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12 }}
          width={leftMargin - 10}
        />
        <Tooltip
          formatter={(value) => [String(value), metric]}
          labelStyle={{ fontWeight: 600 }}
        />
        <Bar
          dataKey="value"
          fill={color}
          radius={[0, 4, 4, 0]}
          barSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
