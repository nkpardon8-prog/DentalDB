import {
  LogIn,
  User,
  Calendar,
  FileText,
  Clock,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react"

export interface ActivityItem {
  id: string
  userName: string
  action: string
  detail: string
  time: string
  type: "login" | "patient" | "appointment" | "claim" | "clock" | "other"
}

interface ActivityFeedProps {
  activities: ActivityItem[]
}

const typeConfig: Record<
  ActivityItem["type"],
  { icon: LucideIcon; iconColor: string; bgColor: string }
> = {
  login: { icon: LogIn, iconColor: "text-blue-600", bgColor: "bg-blue-50" },
  patient: { icon: User, iconColor: "text-green-600", bgColor: "bg-green-50" },
  appointment: { icon: Calendar, iconColor: "text-purple-600", bgColor: "bg-purple-50" },
  claim: { icon: FileText, iconColor: "text-orange-600", bgColor: "bg-orange-50" },
  clock: { icon: Clock, iconColor: "text-teal-600", bgColor: "bg-teal-50" },
  other: { icon: MoreHorizontal, iconColor: "text-gray-600", bgColor: "bg-gray-100" },
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="max-h-96 overflow-y-auto rounded-xl bg-white shadow-sm">
      <ul className="divide-y divide-gray-100">
        {activities.map((activity) => {
          const config = typeConfig[activity.type]
          const Icon = config.icon

          return (
            <li
              key={activity.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.bgColor}`}
              >
                <Icon className={`h-4 w-4 ${config.iconColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-900">
                  <span className="font-semibold">{activity.userName}</span>{" "}
                  {activity.action}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {activity.detail}
                </p>
              </div>
              <span className="shrink-0 text-xs text-gray-400">
                {activity.time}
              </span>
            </li>
          )
        })}
        {activities.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-gray-500">
            No recent activity
          </li>
        )}
      </ul>
    </div>
  )
}
