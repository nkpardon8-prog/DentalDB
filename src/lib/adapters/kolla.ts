import type {
  PmsAdapter,
  NormalizedEmployee,
  NormalizedProvider,
  NormalizedUserMapping,
  NormalizedClockEvent,
  NormalizedAuditLog,
  NormalizedAppointment,
  NormalizedClaim,
  NormalizedProcedureLog,
  NormalizedSchedule,
  NormalizedInsVerification,
} from "./types"
import { KollaClient } from "./kolla-client"
import { stableHash } from "./hash"
import type {
  KollaAppointment,
  KollaClaim,
  KollaResource,
  KollaTreatmentPlanProcedure,
} from "./kolla-types"

// =============================================================================
// Kolla Adapter
// =============================================================================
// Implements PmsAdapter for Eaglesoft and Dentrix via Kolla's unified API.
// A single class parameterized by PMS label — both PMS types use the same
// Kolla endpoints with the same response shapes.
// =============================================================================

export class KollaAdapter implements PmsAdapter {
  private client: KollaClient
  private pmsLabel: string
  private resourcesCache: KollaResource[] | null = null

  constructor(
    bearerToken: string,
    connectorId: string,
    consumerId: string,
    pmsLabel: string,
  ) {
    this.client = new KollaClient(bearerToken, connectorId, consumerId)
    this.pmsLabel = pmsLabel
  }

  async testConnection(): Promise<boolean> {
    return this.client.testConnection()
  }

  private async getResources(): Promise<KollaResource[]> {
    if (!this.resourcesCache) {
      this.resourcesCache = await this.client.get<KollaResource>("/resources")
    }
    return this.resourcesCache
  }

  async getEmployees(): Promise<NormalizedEmployee[]> {
    const resources = await this.getResources()
    return resources
      .filter((r) => r.type === "provider" || r.type === "hygienist")
      .map((r) => {
        const [first, ...rest] = r.name.split(" ")
        return {
          id: stableHash(r.id),
          firstName: first || r.name,
          lastName: rest.join(" ") || "",
          isHidden: !r.is_active,
        }
      })
  }

  async getProviders(): Promise<NormalizedProvider[]> {
    const resources = await this.getResources()
    return resources
      .filter((r) => r.type === "provider")
      .map((r) => {
        const [first, ...rest] = r.name.split(" ")
        return {
          id: stableHash(r.id),
          abbr: (first?.charAt(0) || "") + (rest[0]?.charAt(0) || ""),
          firstName: first || r.name,
          lastName: rest.join(" ") || "",
          isHidden: !r.is_active,
        }
      })
  }

  async getUserMappings(): Promise<NormalizedUserMapping[]> {
    return []
  }

  async getClockEvents(
    _dateStart: string,
    _dateEnd: string,
  ): Promise<NormalizedClockEvent[]> {
    return []
  }

  async getAuditLogs(since: Date): Promise<NormalizedAuditLog[]> {
    const sinceStr = since.toISOString()

    const [appointments, claims] = await Promise.all([
      this.client.get<KollaAppointment>("/appointments", {
        filter: `updated_time > '${sinceStr}'`,
      }),
      this.client.get<KollaClaim>("/claims", {
        filter: `updated_time > '${sinceStr}'`,
      }),
    ])

    const logs: NormalizedAuditLog[] = []

    for (const apt of appointments) {
      logs.push({
        id: stableHash("apt:" + apt.id),
        permType: "AppointmentEdit",
        userNum: 0,
        userName: null,
        logDateTime: new Date(apt.updated_time),
        logText: `Appointment ${apt.status} for patient ${apt.contact_id}`,
        patNum: stableHash(apt.contact_id),
        compName: null,
        logSource: this.pmsLabel,
        source: "inferred",
      })
    }

    for (const cl of claims) {
      logs.push({
        id: stableHash("clm:" + cl.id),
        permType: "ClaimEdit",
        userNum: 0,
        userName: null,
        logDateTime: new Date(cl.updated_time || cl.sent_date),
        logText: `Claim ${cl.status} — $${cl.fee} for patient ${cl.contact_id}`,
        patNum: stableHash(cl.contact_id),
        compName: null,
        logSource: this.pmsLabel,
        source: "inferred",
      })
    }

    return logs.sort(
      (a, b) => b.logDateTime.getTime() - a.logDateTime.getTime(),
    )
  }

  async getAppointments(since: Date): Promise<NormalizedAppointment[]> {
    const sinceStr = since.toISOString()
    const rows = await this.client.get<KollaAppointment>("/appointments", {
      filter: `updated_time > '${sinceStr}'`,
    })
    return rows.map((apt) => ({
      id: stableHash(apt.id),
      patNum: stableHash(apt.contact_id),
      aptStatus: apt.status,
      aptDateTime: new Date(apt.start_time),
      provNum: stableHash(apt.provider_id),
      confirmedStatus: apt.confirmation_status === "Confirmed" ? 1 : 0,
      note: apt.note || null,
      dateTimeArrived: null,
      dateTimeSeated: null,
      dateTimeDismissed: null,
    }))
  }

  async getClaims(since: Date): Promise<NormalizedClaim[]> {
    const sinceStr = since.toISOString()
    const rows = await this.client.get<KollaClaim>("/claims", {
      filter: `updated_time > '${sinceStr}'`,
    })
    return rows.map((cl) => ({
      id: stableHash(cl.id),
      patNum: stableHash(cl.contact_id),
      claimStatus: cl.status,
      dateSent: cl.sent_date ? new Date(cl.sent_date) : null,
      dateReceived: cl.received_date ? new Date(cl.received_date) : null,
      claimFee: cl.fee || 0,
      insPayAmt: cl.insurance_payment || 0,
      provNum: stableHash(cl.provider_id),
    }))
  }

  async getSchedules(
    _dateStart: string,
    _dateEnd: string,
  ): Promise<NormalizedSchedule[]> {
    // Kolla API does not expose schedule data
    return []
  }

  async getInsVerifications(_since: Date): Promise<NormalizedInsVerification[]> {
    // Kolla API does not expose insurance verification data
    return []
  }

  async getProcedureLogs(since: Date): Promise<NormalizedProcedureLog[]> {
    const sinceStr = since.toISOString()
    const rows = await this.client.get<KollaTreatmentPlanProcedure>(
      "/treatment-plan-procedures",
      {
        filter: `updated_time > '${sinceStr}'`,
      },
    )
    return rows.map((pl) => ({
      id: stableHash(pl.id),
      patNum: stableHash(pl.contact_id),
      provNum: stableHash(pl.provider_id),
      procDate: new Date(pl.date),
      procStatus: pl.status,
      procCode: pl.procedure_code,
      procFee: pl.fee || 0,
      description: pl.description || null,
    }))
  }
}
