// =============================================================================
// Kolla Unified Dental API Client
// =============================================================================
// HTTP client for Kolla's unified dental API (https://docs.kolla.dev/reference).
// Used by KollaAdapter to integrate Eaglesoft and Dentrix via middleware.
// =============================================================================

export class KollaClient {
  private baseUrl: string
  private bearerToken: string
  private connectorId: string
  private consumerId: string
  private lastRequestTime = 0

  constructor(bearerToken: string, connectorId: string, consumerId: string) {
    this.baseUrl =
      process.env.KOLLA_API_URL || "https://unify.kolla.dev/dental/v1"
    this.bearerToken = bearerToken
    this.connectorId = connectorId
    this.consumerId = consumerId
  }

  private async rateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime
    if (elapsed < 1000) {
      await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed))
    }
    this.lastRequestTime = Date.now()
  }

  async get<T>(
    endpoint: string,
    params?: Record<string, string>,
  ): Promise<T[]> {
    const allItems: T[] = []
    let pageToken: string | undefined

    do {
      await this.rateLimit()

      const url = new URL(`${this.baseUrl}${endpoint}`)
      if (params) {
        for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
      }
      if (!params?.page_size) url.searchParams.set("page_size", "1000")
      if (pageToken) url.searchParams.set("page_token", pageToken)

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
          "connector-id": this.connectorId,
          "consumer-id": this.consumerId,
          "Content-Type": "application/json",
        },
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Kolla API error ${res.status}: ${body}`)
      }

      const data = await res.json()
      const items: T[] = data.items ?? data
      allItems.push(...items)
      pageToken = data.next_page_token
    } while (pageToken)

    return allItems
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.get("/resources", { page_size: "1" })
      return true
    } catch {
      return false
    }
  }
}
