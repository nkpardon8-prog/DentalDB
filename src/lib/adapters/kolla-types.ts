// =============================================================================
// Kolla API Response Types
// =============================================================================
// TypeScript types for Kolla's unified dental API responses.
// Kolla uses snake_case in all JSON responses.
// =============================================================================

export interface KollaAppointment {
  id: string
  contact_id: string
  start_time: string
  end_time: string
  status: string
  operatory_id: string
  provider_id: string
  confirmation_status: string
  note: string
  created_time: string
  updated_time: string
}

export interface KollaClaim {
  id: string
  contact_id: string
  status: string
  sent_date: string
  received_date: string
  fee: number
  insurance_payment: number
  provider_id: string
  updated_time?: string
}

export interface KollaResource {
  id: string
  name: string
  type: string
  is_active: boolean
}

export interface KollaTreatmentPlanProcedure {
  id: string
  contact_id: string
  provider_id: string
  procedure_code: string
  fee: number
  status: string
  date: string
  description: string
  updated_time?: string
}
