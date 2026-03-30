"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, X } from "lucide-react"
import { useRouter } from "next/navigation"

export function DemoBanner() {
  const [dataMode, setDataMode] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [exiting, setExiting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        setDataMode(data.settings?.dataMode || "unconfigured")
      })
      .catch(() => {})
  }, [])

  if (dataMode !== "demo" || dismissed) return null

  async function handleExitDemo() {
    if (!confirm("This will clear all demo data. Are you sure?")) return
    setExiting(true)
    await fetch("/api/settings/demo-off", { method: "POST" })
    window.location.href = "/dashboard/settings"
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <span className="text-sm text-amber-800">
          <strong>Demo Mode</strong> — You're viewing sample data.
        </span>
        <button
          onClick={handleExitDemo}
          disabled={exiting}
          className="ml-2 text-sm font-medium text-amber-700 underline hover:text-amber-900 disabled:opacity-50"
        >
          {exiting ? "Clearing..." : "Exit Demo"}
        </button>
        <button
          onClick={() => router.push("/dashboard/settings")}
          className="text-sm font-medium text-amber-700 underline hover:text-amber-900"
        >
          Connect Office
        </button>
      </div>
      <button onClick={() => setDismissed(true)} className="text-amber-600 hover:text-amber-800">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
