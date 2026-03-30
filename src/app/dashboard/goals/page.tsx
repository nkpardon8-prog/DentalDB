"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, DollarSign, FileText, CalendarCheck } from "lucide-react"
import { GoalProgress } from "@/components/dashboard/goal-progress"

interface GoalItem {
  id: string
  type: string
  period: string
  target: number
  employeeId: number | null
  actual: number
  progress: number
  employee: { id: number; firstName: string; lastName: string } | null
}

const GOAL_TYPES = [
  { value: "production", label: "Production", icon: DollarSign },
  { value: "claims", label: "Claims", icon: FileText },
  { value: "appointments", label: "Appointments", icon: CalendarCheck },
]

const GOAL_PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
]

function getGoalFormat(type: string): "currency" | "number" {
  return type === "production" ? "currency" : "number"
}

function getGoalIcon(type: string) {
  const found = GOAL_TYPES.find((t) => t.value === type)
  return found?.icon ?? DollarSign
}

export default function GoalsPage() {
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState("production")
  const [formPeriod, setFormPeriod] = useState("daily")
  const [formTarget, setFormTarget] = useState("")
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{ goals: GoalItem[] }>({
    queryKey: ["goals"],
    queryFn: async () => {
      const res = await fetch("/api/goals")
      if (!res.ok) throw new Error("Failed to fetch goals")
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: { type: string; period: string; target: number }) => {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to create goal")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] })
      setShowForm(false)
      setFormTarget("")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/goals?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete goal")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const target = Number(formTarget)
    if (!target || target <= 0) return
    createMutation.mutate({ type: formType, period: formPeriod, target })
  }

  const goals = data?.goals ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Goal
        </button>
      </div>

      {/* Add Goal Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap items-end gap-4 rounded-xl bg-white p-4 shadow-sm"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Type
            </label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {GOAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Period
            </label>
            <select
              value={formPeriod}
              onChange={(e) => setFormPeriod(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {GOAL_PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Target
            </label>
            <input
              type="number"
              min="1"
              step="any"
              value={formTarget}
              onChange={(e) => setFormTarget(e.target.value)}
              placeholder={formType === "production" ? "5000" : "100"}
              className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Goals grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl bg-white p-6 shadow-sm">
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="mt-3 h-3 w-full rounded bg-gray-200" />
              <div className="mt-2 h-2.5 w-full rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            No goals set. Add one to start tracking.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const Icon = getGoalIcon(goal.type)
            const typeLabel = GOAL_TYPES.find((t) => t.value === goal.type)?.label ?? goal.type
            const periodLabel = goal.period.charAt(0).toUpperCase() + goal.period.slice(1)

            return (
              <div key={goal.id} className="rounded-xl bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                      <Icon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-900">
                        {typeLabel}
                      </span>
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        {periodLabel}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(goal.id)}
                    disabled={deleteMutation.isPending}
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Delete goal"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {goal.employee && (
                  <p className="mb-2 text-xs text-gray-500">
                    {goal.employee.firstName} {goal.employee.lastName}
                  </p>
                )}

                <GoalProgress
                  title={typeLabel}
                  current={goal.actual}
                  target={goal.target}
                  format={getGoalFormat(goal.type)}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
