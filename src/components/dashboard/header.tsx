"use client"

import { useState, useCallback } from "react"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { RefreshCw, ChevronDown, LogOut } from "lucide-react"
import { AlertBell } from "./alert-bell"

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/employees": "Employees",
  "/dashboard/activity": "Activity Log",
  "/dashboard/timeclock": "Time Clock",
  "/dashboard/appointments": "Appointments",
  "/dashboard/claims": "Claims",
  "/dashboard/production": "Production",
  "/dashboard/alerts": "Alerts",
  "/dashboard/goals": "Goals",
  "/dashboard/productivity": "Productivity",
  "/dashboard/schedule": "Schedule",
  "/dashboard/reports": "Reports",
  "/dashboard/insurance": "Insurance",
  "/dashboard/settings": "Settings",
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

export function Header() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const pageTitle = pageTitles[pathname] ?? "Dashboard"
  const userName = session?.user?.name ?? "User"
  const userInitial = userName.charAt(0).toUpperCase()

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      const res = await fetch("/api/sync", { method: "POST" })
      if (!res.ok) throw new Error("Sync failed")
      setLastSynced(new Date())
    } catch {
      // Sync error is visible via the lack of updated timestamp
    } finally {
      setSyncing(false)
    }
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-white px-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {/* Page title */}
      <h1 className="text-lg font-semibold text-slate-800 tracking-tight">
        {pageTitle}
      </h1>

      {/* Right side actions */}
      <div className="flex items-center gap-1">
        {/* Sync button */}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-gray-400 transition-colors duration-150 hover:text-gray-600 hover:bg-gray-50/80 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
          />
          {lastSynced ? (
            <span className="text-xs text-gray-400">
              {getTimeAgo(lastSynced)}
            </span>
          ) : (
            <span className="text-xs">Sync</span>
          )}
        </button>

        {/* Alert bell */}
        <div className="px-1">
          <AlertBell />
        </div>

        {/* Thin separator */}
        <div className="h-5 w-px bg-gray-200/80 mx-2" />

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-gray-50/80"
          >
            {/* Avatar with initial */}
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-indigo-50 border border-indigo-100">
              <span className="text-xs font-semibold text-indigo-600 leading-none">
                {userInitial}
              </span>
            </div>
            <span className="text-[13px] font-medium text-slate-600 hidden sm:inline">
              {userName}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {userMenuOpen && (
            <>
              {/* Invisible click-away overlay */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-gray-200/80 bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.08)] z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-[12px] text-slate-400 truncate">{session?.user?.email ?? ""}</p>
                </div>
                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-slate-600 transition-colors duration-150 hover:bg-gray-50 hover:text-slate-800"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
