interface EmployeeStatusBadgeProps {
  status: "online" | "break" | "lunch" | "offline"
  isRemote?: boolean
}

const statusConfig = {
  online: { dot: "bg-green-500", label: "Online", textColor: "text-green-700", bgColor: "bg-green-50" },
  break: { dot: "bg-yellow-500", label: "Break", textColor: "text-yellow-700", bgColor: "bg-yellow-50" },
  lunch: { dot: "bg-orange-500", label: "Lunch", textColor: "text-orange-700", bgColor: "bg-orange-50" },
  offline: { dot: "bg-gray-400", label: "Offline", textColor: "text-gray-600", bgColor: "bg-gray-100" },
} as const

export function EmployeeStatusBadge({ status, isRemote }: EmployeeStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bgColor} ${config.textColor}`}
      >
        <span className={`inline-block h-2 w-2 rounded-full ${config.dot}`} />
        {config.label}
      </span>
      {isRemote && (
        <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
          Remote
        </span>
      )}
    </div>
  )
}
