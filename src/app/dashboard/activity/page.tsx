"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Activity,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useActivityLog, useEmployees } from "@/hooks/use-dashboard-data"
import { formatDateTime } from "@/lib/utils"

const PERM_TYPES = [
  "Login",
  "PatientEdit",
  "AppointmentCreate",
  "AppointmentEdit",
  "ClaimCreate",
  "ClaimSent",
  "ProcCompleted",
  "RxCreate",
  "SecurityAdmin",
  "ImageEdit",
  "NoteEdit",
] as const

export default function ActivityPage() {
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [permType, setPermType] = useState("")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [dataSource, setDataSource] = useState("opendental")

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(data => {
      if (data.settings?.dataSource) setDataSource(data.settings.dataSource)
    })
  }, [])

  const filters = useMemo(() => {
    const params: Record<string, string> = { page: String(page), limit: "50" }
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo
    if (employeeId) params.employeeId = employeeId
    if (permType) params.permType = permType
    if (search) params.search = search
    return params
  }, [page, dateFrom, dateTo, employeeId, permType, search])

  const { data, isLoading } = useActivityLog(filters)
  const { data: employees } = useEmployees()

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setSearch(searchInput)
      setPage(1)
    },
    [searchInput]
  )

  const handleFilterChange = useCallback(
    (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
      setter(e.target.value)
      setPage(1)
    },
    []
  )

  const exportCsv = useCallback(() => {
    if (!data?.logs?.length) return

    const headers = [
      "Time",
      "Employee",
      "Action",
      "Details",
      "Patient ID",
      "Workstation",
      "Source",
    ]
    const rows = data.logs.map(
      (log: {
        logDateTime: string
        employee?: { firstName: string; lastName: string } | null
        userName?: string | null
        permType: string
        logText: string
        patNum?: number | null
        compName?: string | null
        logSource?: string | null
      }) => [
        new Date(log.logDateTime).toISOString(),
        log.employee
          ? `${log.employee.firstName} ${log.employee.lastName}`
          : log.userName ?? "Unknown",
        log.permType,
        `"${(log.logText ?? "").replace(/"/g, '""')}"`,
        log.patNum ?? "",
        log.compName ?? "",
        log.logSource ?? "",
      ]
    )

    const csv = [headers.join(","), ...rows.map((r: (string | number)[]) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [data])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-50 p-2">
            <Activity className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
            <p className="text-sm text-gray-500">
              Audit trail of all system actions
            </p>
          </div>
        </div>
        <button
          onClick={exportCsv}
          disabled={!data?.logs?.length}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={handleFilterChange(setDateFrom)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={handleFilterChange(setDateTo)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Employee
            </label>
            <select
              value={employeeId}
              onChange={handleFilterChange(setEmployeeId)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Employees</option>
              {(employees ?? []).map(
                (emp: { id: number; firstName: string; lastName: string }) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                )
              )}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Action Type
            </label>
            <select
              value={permType}
              onChange={handleFilterChange(setPermType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              {PERM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Search
            </label>
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search log text..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </form>
          </div>
        </div>
      </div>

      {/* PMS info banner */}
      {dataSource !== "opendental" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800">
            Activity logs for {dataSource === "eaglesoft" ? "Eaglesoft" : "Dentrix"} are
            inferred from data changes, not from direct audit logs. They show what changed
            but not who made the change.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-500">
                  Time
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-500">
                  Employee
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-500">
                  Action
                </th>
                <th className="px-4 py-3 font-medium text-gray-500">
                  Details
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-500">
                  Patient ID
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-500">
                  Workstation
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                        </td>
                      ))}
                    </tr>
                  ))
                : (data?.logs ?? []).map(
                    (log: {
                      id: number
                      logDateTime: string
                      employee?: {
                        firstName: string
                        lastName: string
                      } | null
                      userName?: string | null
                      permType: string
                      logText: string
                      patNum?: number | null
                      compName?: string | null
                      source?: string
                    }) => (
                      <tr
                        key={log.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {formatDateTime(log.logDateTime)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                          {log.employee
                            ? `${log.employee.firstName} ${log.employee.lastName}`
                            : log.userName ?? "Unknown"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                            {log.permType}
                          </span>
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-gray-600">
                          {log.logText}
                          {log.source === "inferred" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 ml-1"
                              title="Inferred from data changes, not a direct audit log">
                              Inferred
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {log.patNum ?? "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                          {log.compName ?? "-"}
                        </td>
                      </tr>
                    )
                  )}
              {!isLoading && data?.logs?.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No activity logs found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && totalPages > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-medium">
                {(data.page - 1) * data.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(data.page * data.limit, data.total)}
              </span>{" "}
              of <span className="font-medium">{data.total}</span> results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
