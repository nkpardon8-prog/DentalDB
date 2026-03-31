"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Activity,
  Clock,
  Calendar,
  FileText,
  DollarSign,
  BarChart3,
  CalendarClock,
  Settings,
  Bell,
  Target,
  FileDown,
  ShieldCheck,
} from "lucide-react"

const navSections = [
  {
    label: "Overview",
    items: [
      { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { label: "Employees", icon: Users, href: "/dashboard/employees" },
      { label: "Activity Log", icon: Activity, href: "/dashboard/activity" },
      { label: "Time Clock", icon: Clock, href: "/dashboard/timeclock" },
      { label: "Schedule", icon: CalendarClock, href: "/dashboard/schedule" },
    ],
  },
  {
    label: "Financials",
    items: [
      { label: "Appointments", icon: Calendar, href: "/dashboard/appointments" },
      { label: "Claims", icon: FileText, href: "/dashboard/claims" },
      { label: "Production", icon: DollarSign, href: "/dashboard/production" },
      { label: "Insurance", icon: ShieldCheck, href: "/dashboard/insurance" },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Alerts", icon: Bell, href: "/dashboard/alerts" },
      { label: "Goals", icon: Target, href: "/dashboard/goals" },
      { label: "Productivity", icon: BarChart3, href: "/dashboard/productivity" },
      { label: "Reports", icon: FileDown, href: "/dashboard/reports" },
    ],
  },
]

const bottomItems = [
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
]

export function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-slate-400 flex flex-col">
      {/* Logo area */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Image src="/logo.png" alt="DentalAdmin logo" width={32} height={32} className="rounded-lg" />
        <span className="text-[15px] font-semibold text-white tracking-tight">
          Dental<span className="text-indigo-400">Admin</span>
        </span>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-slate-700/60" />

      {/* Main navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pt-4 pb-2">
        {navSections.map((section) => (
          <div key={section.label} className="mb-5">
            {/* Section label */}
            <div className="px-3 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                {section.label}
              </span>
            </div>

            {/* Section items */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                      active
                        ? "bg-indigo-500/10 text-white"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                    }`}
                  >
                    {/* Active indicator bar */}
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-indigo-500" />
                    )}
                    <Icon className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
                      active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400"
                    }`} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {/* Separator before settings */}
        <div className="mx-2 mb-3 border-t border-slate-700/50" />

        {/* Bottom items */}
        {bottomItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                active
                  ? "bg-indigo-500/10 text-white"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-indigo-500" />
              )}
              <Icon className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
                active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400"
              }`} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom branding */}
      <div className="px-5 py-4 border-t border-slate-700/40">
        <p className="text-[10px] text-slate-600 tracking-wide">
          v1.0 &middot; Local instance
        </p>
      </div>
    </aside>
  )
}
