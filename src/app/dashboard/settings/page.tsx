"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Settings, Shield, Database, CheckCircle, XCircle, Loader2, AlertTriangle, Mail, ChevronDown, ChevronRight } from "lucide-react"

const fieldLabels: Record<string, {
  banner: string; helpText: string
}> = {
  opendental: {
    banner: "Connect Your Open Dental Office",
    helpText: "Enter your MySQL connection details for the Open Dental database on your server.",
  },
  eaglesoft: {
    banner: "Connect Your Eaglesoft Office",
    helpText: "Enter your Kolla credentials. The practice must have the Kolla Agent installed on their Eaglesoft server.",
  },
  dentrix: {
    banner: "Connect Your Dentrix Office",
    helpText: "Enter your Kolla credentials. The practice must have the Kolla Agent installed on their Dentrix server.",
  },
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === "ADMIN"

  const [officeName, setOfficeName] = useState("")
  const [timezone, setTimezone] = useState("America/New_York")
  const [dataSource, setDataSource] = useState("opendental")
  const [dataMode, setDataMode] = useState("unconfigured")
  // Open Dental MySQL fields
  const [mysqlHost, setMysqlHost] = useState("localhost")
  const [mysqlPort, setMysqlPort] = useState(3306)
  const [mysqlUser, setMysqlUser] = useState("")
  const [mysqlPassword, setMysqlPassword] = useState("")
  const [mysqlDatabase, setMysqlDatabase] = useState("opendental")
  // Kolla fields (Eaglesoft/Dentrix)
  const [kollaToken, setKollaToken] = useState("")
  const [kollaSecret, setKollaSecret] = useState("")
  // UI state
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null)
  const [message, setMessage] = useState("")
  const [configured, setConfigured] = useState(false)
  const [syncStates, setSyncStates] = useState<any[]>([])
  const [loadingMock, setLoadingMock] = useState(false)
  const [exitingDemo, setExitingDemo] = useState(false)

  // Email settings state
  const [emailExpanded, setEmailExpanded] = useState(false)
  const [smtpHost, setSmtpHost] = useState("")
  const [smtpPort, setSmtpPort] = useState(587)
  const [smtpUser, setSmtpUser] = useState("")
  const [smtpPassword, setSmtpPassword] = useState("")
  const [smtpFrom, setSmtpFrom] = useState("")
  const [reportRecipients, setReportRecipients] = useState("")
  const [dailyReportEnabled, setDailyReportEnabled] = useState(false)
  const [dailyReportTime, setDailyReportTime] = useState("18:00")
  const [alertEmailEnabled, setAlertEmailEnabled] = useState(false)
  const [emailHasPassword, setEmailHasPassword] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [emailMessage, setEmailMessage] = useState("")

  const labels = fieldLabels[dataSource] || fieldLabels.opendental
  const isKollaPms = dataSource === "eaglesoft" || dataSource === "dentrix"

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setOfficeName(data.settings.officeName || "")
          setTimezone(data.settings.timezone || "America/New_York")
          setDataSource(data.settings.dataSource || "opendental")
          setDataMode(data.settings.dataMode || "unconfigured")
          setMysqlHost(data.settings.mysqlHost || "localhost")
          setMysqlPort(data.settings.mysqlPort || 3306)
          setMysqlUser(data.settings.mysqlUser || "")
          setMysqlDatabase(data.settings.mysqlDatabase || "opendental")
          setConfigured(data.settings.hasConnection)
        }
        if (data.syncStates) setSyncStates(data.syncStates)
      })
      .catch(() => {})

    // Fetch email settings
    fetch("/api/settings/email")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setSmtpHost(data.settings.smtpHost || "")
          setSmtpPort(data.settings.smtpPort || 587)
          setSmtpUser(data.settings.smtpUser || "")
          setSmtpFrom(data.settings.smtpFrom || "")
          setReportRecipients(data.settings.reportRecipients || "")
          setDailyReportEnabled(data.settings.dailyReportEnabled || false)
          setDailyReportTime(data.settings.dailyReportTime || "18:00")
          setAlertEmailEnabled(data.settings.alertEmailEnabled || false)
          setEmailHasPassword(data.settings.hasPassword || false)
        }
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    setMessage("")
    try {
      const payload: any = { officeName, timezone, dataSource }
      if (isKollaPms) {
        if (kollaToken) payload.kollaToken = kollaToken
        if (kollaSecret) payload.kollaSecret = kollaSecret
      } else {
        payload.mysqlHost = mysqlHost
        payload.mysqlPort = mysqlPort
        payload.mysqlUser = mysqlUser
        if (mysqlPassword) payload.mysqlPassword = mysqlPassword
        payload.mysqlDatabase = mysqlDatabase
      }
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage("Settings saved successfully")
        setConfigured(true)
        setMysqlPassword("")
        setKollaToken("")
        setKollaSecret("")
      } else {
        setMessage(data.error || "Failed to save")
      }
    } catch {
      setMessage("Failed to save settings")
    }
    setSaving(false)
  }

  async function handleTestConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/settings/test", { method: "POST" })
      setTestResult(res.ok ? "success" : "error")
    } catch {
      setTestResult("error")
    }
    setTesting(false)
  }

  async function handleLoadMockData() {
    setLoadingMock(true)
    try {
      const res = await fetch("/api/settings/mock", { method: "POST" })
      const data = await res.json()
      setMessage(data.message || "Mock data loaded")
    } catch {
      setMessage("Failed to load mock data")
    }
    setLoadingMock(false)
  }

  async function handleExitDemo() {
    if (!confirm("This will clear all demo data and reset to first-run setup. Are you sure?")) return
    setExitingDemo(true)
    try {
      await fetch("/api/settings/demo-off", { method: "POST" })
      window.location.href = "/dashboard/settings"
    } catch {
      setMessage("Failed to exit demo mode")
      setExitingDemo(false)
    }
  }

  async function handleSaveEmail() {
    setSavingEmail(true)
    setEmailMessage("")
    try {
      const payload: any = {
        smtpHost,
        smtpPort,
        smtpUser,
        smtpFrom,
        reportRecipients,
        dailyReportEnabled,
        dailyReportTime,
        alertEmailEnabled,
      }
      if (smtpPassword) payload.smtpPassword = smtpPassword

      const res = await fetch("/api/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setEmailMessage("Email settings saved successfully")
        setSmtpPassword("")
        setEmailHasPassword(true)
      } else {
        setEmailMessage(data.error || "Failed to save email settings")
      }
    } catch {
      setEmailMessage("Failed to save email settings")
    }
    setSavingEmail(false)
  }

  async function handleTestEmail() {
    setTestingEmail(true)
    setEmailMessage("")
    try {
      const res = await fetch("/api/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      })
      const data = await res.json()
      if (res.ok) {
        setEmailMessage("Test email sent successfully")
      } else {
        setEmailMessage(data.error || "Failed to send test email")
      }
    } catch {
      setEmailMessage("Failed to send test email")
    }
    setTestingEmail(false)
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Admin access required</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* First-run banner */}
      {!configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">{labels.banner}</p>
            <p className="text-sm text-amber-700 mt-1">{labels.helpText}</p>
          </div>
        </div>
      )}

      {/* Demo Mode */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className={`w-5 h-5 ${dataMode === "demo" ? "text-red-600" : "text-purple-600"}`} />
          <h2 className="text-lg font-semibold">Demo Mode</h2>
        </div>
        {dataMode === "demo" ? (
          <>
            <p className="text-sm text-gray-600 mb-4">
              You are currently viewing demo data. Exit demo mode to clear all sample data and configure a real connection.
            </p>
            <button
              onClick={handleExitDemo}
              disabled={exitingDemo}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {exitingDemo ? "Clearing..." : "Exit Demo Mode"}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Load sample data to preview the dashboard without connecting to your practice management system.
            </p>
            <button
              onClick={handleLoadMockData}
              disabled={loadingMock}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {loadingMock ? "Loading..." : "Load Mock Data"}
            </button>
          </>
        )}
      </div>

      {/* Data Source & Connection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Practice Management Connection</h2>
        </div>

        <div className="space-y-4">
          {/* Data Source Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Source</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dataSource"
                  value="opendental"
                  checked={dataSource === "opendental"}
                  onChange={() => setDataSource("opendental")}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Open Dental</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dataSource"
                  value="eaglesoft"
                  checked={dataSource === "eaglesoft"}
                  onChange={() => setDataSource("eaglesoft")}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Eaglesoft</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dataSource"
                  value="dentrix"
                  checked={dataSource === "dentrix"}
                  onChange={() => setDataSource("dentrix")}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Dentrix</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Office Name</label>
            <input
              type="text"
              value={officeName}
              onChange={(e) => setOfficeName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="My Dental Office"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="America/Anchorage">Alaska Time</option>
              <option value="Pacific/Honolulu">Hawaii Time</option>
            </select>
          </div>

          <hr className="border-gray-200" />

          {/* Open Dental MySQL Connection */}
          {!isKollaPms && (
            <>
              <p className="text-sm font-medium text-gray-700">MySQL Connection</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MySQL Host</label>
                  <input
                    type="text"
                    value={mysqlHost}
                    onChange={(e) => setMysqlHost(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MySQL Port</label>
                  <input
                    type="number"
                    value={mysqlPort}
                    onChange={(e) => setMysqlPort(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="3306"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MySQL User</label>
                <input
                  type="text"
                  value={mysqlUser}
                  onChange={(e) => setMysqlUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter MySQL username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MySQL Password{" "}
                  {configured && <span className="text-green-600">(saved)</span>}
                </label>
                <input
                  type="password"
                  value={mysqlPassword}
                  onChange={(e) => setMysqlPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={configured ? "Enter new password to update" : "Enter MySQL password"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Database Name</label>
                <input
                  type="text"
                  value={mysqlDatabase}
                  onChange={(e) => setMysqlDatabase(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="opendental"
                />
              </div>
            </>
          )}

          {/* Kolla Connection (Eaglesoft/Dentrix) */}
          {isKollaPms && (
            <>
              <p className="text-sm font-medium text-gray-700">Kolla API Connection</p>
              <p className="text-xs text-gray-500">
                The practice must have the Kolla Agent installed on their {dataSource === "eaglesoft" ? "Eaglesoft" : "Dentrix"} server.
                Sign up at kolla.dev for credentials.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kolla API Token{" "}
                  {configured && <span className="text-green-600">(saved)</span>}
                </label>
                <input
                  type="password"
                  value={kollaToken}
                  onChange={(e) => setKollaToken(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={configured ? "Enter new token to update" : "Enter your Kolla bearer token"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Connector ID : Consumer ID{" "}
                  {configured && <span className="text-green-600">(saved)</span>}
                </label>
                <input
                  type="password"
                  value={kollaSecret}
                  onChange={(e) => setKollaSecret(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={configured ? "Enter new credentials to update" : "connectorId:consumerId"}
                />
              </div>
            </>
          )}

          {message && (
            <div className={`text-sm px-4 py-2 rounded-lg ${message.includes("success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {message}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !officeName}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>

            {configured && (
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : testResult === "success" ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : testResult === "error" ? (
                  <XCircle className="w-4 h-4 text-red-600" />
                ) : null}
                Test Connection
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sync Status */}
      {syncStates.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Sync Status</h2>
          <div className="space-y-2">
            {syncStates.map((s: any) => (
              <div key={s.endpoint} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${s.status === "ok" ? "bg-green-500" : s.status === "running" ? "bg-blue-500 animate-pulse" : "bg-red-500"}`} />
                  <span className="text-sm font-medium capitalize">{s.endpoint}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{s.itemsSynced} items</span>
                  <span>{s.lastRunAt ? new Date(s.lastRunAt).toLocaleTimeString() : "Never"}</span>
                  {s.errorMessage && <span className="text-red-600">{s.errorMessage}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <button
          onClick={() => setEmailExpanded(!emailExpanded)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold">Email Settings</h2>
          </div>
          {emailExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {emailExpanded && (
          <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
            {/* SMTP Configuration */}
            <p className="text-sm font-medium text-gray-700">SMTP Server</p>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                <input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="587"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP User</label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMTP Password{" "}
                {emailHasPassword && <span className="text-green-600">(saved)</span>}
              </label>
              <input
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder={emailHasPassword ? "Enter new password to update" : "Enter SMTP password or app password"}
              />
            </div>

            <hr className="border-gray-200" />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Address</label>
              <input
                type="email"
                value={smtpFrom}
                onChange={(e) => setSmtpFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="reports@yourdental.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Recipients{" "}
                <span className="text-gray-400 font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={reportRecipients}
                onChange={(e) => setReportRecipients(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="admin@yourdental.com, manager@yourdental.com"
              />
            </div>

            <hr className="border-gray-200" />

            {/* Daily Report Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Daily Report Email</p>
                <p className="text-xs text-gray-500">Automatically send the daily production report</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={dailyReportTime}
                  onChange={(e) => setDailyReportTime(e.target.value)}
                  disabled={!dailyReportEnabled}
                  className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                />
                <button
                  onClick={() => setDailyReportEnabled(!dailyReportEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    dailyReportEnabled ? "bg-indigo-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      dailyReportEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Alert Emails Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Alert Emails</p>
                <p className="text-xs text-gray-500">Send email notifications for critical alerts</p>
              </div>
              <button
                onClick={() => setAlertEmailEnabled(!alertEmailEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  alertEmailEnabled ? "bg-indigo-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    alertEmailEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {emailMessage && (
              <div className={`text-sm px-4 py-2 rounded-lg ${emailMessage.includes("success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {emailMessage}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSaveEmail}
                disabled={savingEmail}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingEmail ? "Saving..." : "Save Email Settings"}
              </button>

              {emailHasPassword && smtpHost && (
                <button
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
                >
                  {testingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  Test Email
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
