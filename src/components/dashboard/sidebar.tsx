"use client"

import Link from "next/link"
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
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 shadow-[0_2px_8px_rgba(99,102,241,0.3)]">
          <svg className="h-5 w-5" viewBox="0 0 40 52" fill="none">
            {/* Crown */}
            <path d="M7 16L10.5 8L20 13L29.5 8L33 16H7Z" fill="#fbbf24"/>
            <rect x="7" y="14.5" width="26" height="2.5" rx="0.5" fill="#f59e0b"/>
            <circle cx="14" cy="11" r="1.2" fill="#ef4444"/>
            <circle cx="20" cy="9" r="1.2" fill="#818cf8"/>
            <circle cx="26" cy="11" r="1.2" fill="#10b981"/>
            {/* Tooth — anatomical molar with two roots */}
            <path d="M20 17C14 17 10.5 19.5 9 23C7.5 26.5 8 30 9 33C9.5 34.5 10 36 10.5 38C11 40 11 42 10 45C9.5 47 9 49.5 10 50.5C11 51.5 12.5 50 13 48C13.5 46 14 43 15 41C15.5 40 16 39.5 17 39.5C17.5 42 17 45 17.5 47.5C18 49.5 19 51 20.5 51C22 51 23 49.5 23.5 47.5C24 45 23.5 42 24 39.5C25 39.5 25.5 40 26 41C27 43 27.5 46 28 48C28.5 50 30 51.5 31 50.5C32 49.5 31.5 47 31 45C30 42 30 40 30.5 38C31 36 31.5 34.5 32 33C33 30 33.5 26.5 32 23C30.5 19.5 27 17 20 17Z" fill="white" stroke="white" strokeWidth="0.5"/>
            {/* Root divider line */}
            <path d="M20 34C18.5 36 17 39 16.5 41" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" strokeLinecap="round"/>
            <path d="M21 34C22.5 36 24 39 24.5 41" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" strokeLinecap="round"/>
          </svg>
        </div>
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
