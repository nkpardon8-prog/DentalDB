import { useQuery } from "@tanstack/react-query"

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

export function useDashboardOverview() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetcher("/api/dashboard"),
    refetchInterval: 60_000,
  })
}

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: () => fetcher("/api/employees"),
  })
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ["employees", id],
    queryFn: () => fetcher(`/api/employees?id=${encodeURIComponent(id)}`),
    enabled: !!id,
  })
}

export function useActivityLog(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters)
  const queryString = params.toString()
  const url = queryString ? `/api/activity?${queryString}` : "/api/activity"

  return useQuery({
    queryKey: ["activity", filters],
    queryFn: () => fetcher(url),
  })
}

export function useTimeclock() {
  return useQuery({
    queryKey: ["timeclock"],
    queryFn: () => fetcher("/api/timeclock"),
  })
}

export function useAppointments() {
  return useQuery({
    queryKey: ["appointments"],
    queryFn: () => fetcher("/api/appointments"),
  })
}

export function useClaims() {
  return useQuery({
    queryKey: ["claims"],
    queryFn: () => fetcher("/api/claims"),
  })
}

export function useProduction() {
  return useQuery({
    queryKey: ["production"],
    queryFn: () => fetcher("/api/production"),
  })
}

export function useSyncStatus() {
  return useQuery({
    queryKey: ["sync"],
    queryFn: () => fetcher("/api/sync"),
  })
}

export function useAlerts(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters)
  const queryString = params.toString()
  const url = queryString ? `/api/alerts?${queryString}` : "/api/alerts"

  return useQuery({
    queryKey: ["alerts", filters],
    queryFn: () => fetcher(url),
    refetchInterval: 60_000,
  })
}

export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: () => fetcher("/api/goals"),
  })
}

export function useProductivity(period?: string) {
  const params = period ? `?period=${encodeURIComponent(period)}` : ""
  return useQuery({
    queryKey: ["productivity", period],
    queryFn: () => fetcher(`/api/productivity${params}`),
  })
}

export function useScheduleCompare(date?: string) {
  const params = date ? `?date=${encodeURIComponent(date)}` : ""
  return useQuery({
    queryKey: ["schedule-compare", date],
    queryFn: () => fetcher(`/api/schedule-compare${params}`),
  })
}

export function useInsurance(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters)
  const queryString = params.toString()
  const url = queryString ? `/api/insurance?${queryString}` : "/api/insurance"

  return useQuery({
    queryKey: ["insurance", filters],
    queryFn: () => fetcher(url),
  })
}
