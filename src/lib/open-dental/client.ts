import type {
  ODEmployee,
  ODClockEvent,
  ODAppointment,
  ODClaim,
  ODProcedureLog,
  ODProvider,
} from "./types"

// Re-export types for convenience
export type {
  ODEmployee,
  ODClockEvent,
  ODAppointment,
  ODClaim,
  ODProcedureLog,
  ODProvider,
}

class OpenDentalError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(`OD API Error ${status}: ${message}`)
    this.name = "OpenDentalError"
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class OpenDentalClient {
  private baseUrl = "https://api.opendental.com/api/v1"
  private authHeader: string
  private lastRequestTime = 0
  private minInterval: number

  constructor(
    developerKey: string,
    customerKey: string,
    tier: "free" | "tier2" = "tier2",
  ) {
    this.authHeader = `ODFHIR ${developerKey}/${customerKey}`
    // Free tier: 1 request per 5 seconds. Tier 2: 1 per second.
    this.minInterval = tier === "free" ? 5000 : 1000
  }

  /**
   * Rate-limit enforcement. Waits if the minimum interval between requests
   * hasn't elapsed since the last call.
   */
  private async throttle(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime
    if (elapsed < this.minInterval) {
      await sleep(this.minInterval - elapsed)
    }
    this.lastRequestTime = Date.now()
  }

  /**
   * GET a single page from an OD REST endpoint. Returns an array of items.
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, string>,
  ): Promise<T[]> {
    await this.throttle()

    const url = new URL(`${this.baseUrl}/${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: this.authHeader },
    })

    if (!res.ok) {
      throw new OpenDentalError(res.status, await res.text())
    }

    return res.json()
  }

  /**
   * Auto-paginate through all pages of a GET endpoint.
   * OD returns up to 100 items per page; we keep fetching until we get fewer.
   */
  async getAll<T>(
    endpoint: string,
    params?: Record<string, string>,
  ): Promise<T[]> {
    const results: T[] = []
    let offset = 0

    while (true) {
      const page = await this.get<T>(endpoint, {
        ...params,
        Offset: String(offset),
      })
      results.push(...page)
      if (page.length < 100) break
      offset += 100
    }

    return results
  }

  /**
   * Execute a SQL query via PUT /queries/ShortQuery.
   * Returns a single page (up to 100 rows) at the given offset.
   */
  async query<T>(sql: string, offset = 0): Promise<T[]> {
    await this.throttle()

    const url = new URL(`${this.baseUrl}/queries/ShortQuery`)
    if (offset > 0) {
      url.searchParams.set("Offset", String(offset))
    }

    const res = await fetch(url.toString(), {
      method: "PUT",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ SqlCommand: sql }),
    })

    if (!res.ok) {
      throw new OpenDentalError(res.status, await res.text())
    }

    return res.json()
  }

  /**
   * Auto-paginate through all pages of a SQL query result.
   */
  async queryAll<T>(sql: string): Promise<T[]> {
    const results: T[] = []
    let offset = 0

    while (true) {
      const page = await this.query<T>(sql, offset)
      results.push(...page)
      if (page.length < 100) break
      offset += 100
    }

    return results
  }

  /**
   * Test the connection by fetching the employees list.
   * Returns true if the request succeeds, false otherwise.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.get<ODEmployee>("employees")
      return true
    } catch {
      return false
    }
  }
}
