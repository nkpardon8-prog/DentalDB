"use client"

interface GoalProgressProps {
  title: string
  current: number
  target: number
  format?: "currency" | "number"
}

function formatValue(value: number, format: "currency" | "number"): string {
  if (format === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }
  return new Intl.NumberFormat("en-US").format(value)
}

function getProgressColor(percentage: number): string {
  if (percentage >= 75) return "bg-green-500"
  if (percentage >= 50) return "bg-yellow-500"
  return "bg-red-500"
}

export function GoalProgress({ title, current, target, format = "number" }: GoalProgressProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0
  const roundedPct = Math.round(percentage)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">
          {title}: {formatValue(current, format)} / {formatValue(target, format)} ({roundedPct}%)
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getProgressColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
