import { type LucideIcon } from "lucide-react"

type StatCardColor = "indigo" | "emerald" | "amber" | "rose"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  color?: StatCardColor
}

const colorStyles: Record<
  StatCardColor,
  { dot: string; iconBg: string; iconText: string }
> = {
  indigo: {
    dot: "bg-indigo-500",
    iconBg: "bg-indigo-50",
    iconText: "text-indigo-500",
  },
  emerald: {
    dot: "bg-emerald-500",
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-500",
  },
  amber: {
    dot: "bg-amber-500",
    iconBg: "bg-amber-50",
    iconText: "text-amber-500",
  },
  rose: {
    dot: "bg-rose-500",
    iconBg: "bg-rose-50",
    iconText: "text-rose-500",
  },
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = "indigo",
}: StatCardProps) {
  const styles = colorStyles[color]

  return (
    <div className="card-hover rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
            <p className="text-[13px] font-medium uppercase tracking-wide text-gray-500">
              {title}
            </p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && trendValue && (
            <div>
              {trend === "up" && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  &uarr; {trendValue}
                </span>
              )}
              {trend === "down" && (
                <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                  &darr; {trendValue}
                </span>
              )}
              {trend === "neutral" && (
                <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500">
                  {trendValue}
                </span>
              )}
            </div>
          )}
          {subtitle && (
            <p className="text-xs text-gray-400">{subtitle}</p>
          )}
        </div>
        <div className={`rounded-xl ${styles.iconBg} p-1.5`}>
          <Icon className={`h-5 w-5 ${styles.iconText}`} />
        </div>
      </div>
    </div>
  )
}
