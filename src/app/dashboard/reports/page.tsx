"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  FileText,
  Calendar,
  Clock,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react"

export default function ReportsPage() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === "ADMIN"

  const [emailConfigured, setEmailConfigured] = useState(false)
  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [payrollFrom, setPayrollFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 13)
    return d.toISOString().slice(0, 10)
  })
  const [payrollTo, setPayrollTo] = useState(() => new Date().toISOString().slice(0, 10))

  const [sendingDaily, setSendingDaily] = useState(false)
  const [sendingWeekly, setSendingWeekly] = useState(false)
  const [sendingPayroll, setSendingPayroll] = useState(false)

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    fetch("/api/settings/email")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings?.smtpHost && data.settings?.smtpHost !== "") {
          setEmailConfigured(true)
        }
      })
      .catch(() => {})
  }, [isAdmin])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(timer)
  }, [toast])

  async function sendReport(
    reportType: "daily" | "weekly" | "payroll",
    setLoading: (v: boolean) => void
  ) {
    setLoading(true)
    try {
      const payload: any = { reportType }
      if (reportType === "daily") payload.date = dailyDate
      if (reportType === "payroll") {
        payload.dateFrom = payrollFrom
        payload.dateTo = payrollTo
      }

      const res = await fetch("/api/reports/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (res.ok) {
        setToast({ type: "success", message: data.message || "Report sent successfully" })
      } else {
        setToast({ type: "error", message: data.error || "Failed to send report" })
      }
    } catch {
      setToast({ type: "error", message: "Failed to send report" })
    }
    setLoading(false)
  }

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      {!emailConfigured && isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Email not configured</p>
            <p className="text-sm text-amber-700 mt-1">
              Configure SMTP email in{" "}
              <a href="/dashboard/settings" className="underline font-medium">
                Settings
              </a>{" "}
              to send reports via email.
            </p>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            toast.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Production Report */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Daily Production</h2>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Employee hours, production totals, appointments completed, and claims sent for a single
            day.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={dailyDate}
              onChange={(e) => setDailyDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="mt-auto flex gap-2">
            <a
              href={`/api/reports/daily?date=${dailyDate}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Generate PDF
            </a>
            {emailConfigured && isAdmin && (
              <button
                onClick={() => sendReport("daily", setSendingDaily)}
                disabled={sendingDaily}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {sendingDaily ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Email
              </button>
            )}
          </div>
        </div>

        {/* Weekly Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Weekly Summary</h2>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Day-by-day breakdown of hours, production, appointments, and claims for the past 7 days.
          </p>

          <div className="mb-4">
            <p className="text-xs text-gray-400">
              Automatically covers the last 7 days ending today.
            </p>
          </div>

          <div className="mt-auto flex gap-2">
            <a
              href="/api/reports/weekly"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Generate PDF
            </a>
            {emailConfigured && isAdmin && (
              <button
                onClick={() => sendReport("weekly", setSendingWeekly)}
                disabled={sendingWeekly}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {sendingWeekly ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Email
              </button>
            )}
          </div>
        </div>

        {/* Payroll Report */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Payroll Report</h2>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Per-employee time clock data: regular hours, overtime, break time, days worked, and
            remote days.
          </p>

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input
                type="date"
                value={payrollFrom}
                onChange={(e) => setPayrollFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input
                type="date"
                value={payrollTo}
                onChange={(e) => setPayrollTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-auto flex gap-2">
            <a
              href={`/api/reports/payroll?dateFrom=${payrollFrom}&dateTo=${payrollTo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Generate PDF
            </a>
            {emailConfigured && isAdmin && (
              <button
                onClick={() => sendReport("payroll", setSendingPayroll)}
                disabled={sendingPayroll}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {sendingPayroll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Email
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
