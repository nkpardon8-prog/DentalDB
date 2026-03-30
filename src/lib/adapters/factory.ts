import type { PmsAdapter } from "./types"
import { OpenDentalLocalAdapter } from "./open-dental"
import { KollaAdapter } from "./kolla"
import { decrypt } from "@/lib/crypto"

export function createAdapter(settings: {
  dataSource: string
  mysqlHost: string
  mysqlPort: number
  mysqlUser: string
  mysqlPassword: string
  mysqlDatabase: string
  kollaToken: string
  kollaSecret: string
}): PmsAdapter {
  switch (settings.dataSource) {
    case "eaglesoft":
    case "dentrix": {
      const token = decrypt(settings.kollaToken)
      const secret = decrypt(settings.kollaSecret)
      const [connectorId, consumerId] = secret.split(":")
      if (!connectorId || !consumerId) {
        throw new Error(
          "Invalid Kolla credentials. Expected format: connectorId:consumerId",
        )
      }
      const label =
        settings.dataSource === "eaglesoft" ? "Eaglesoft" : "Dentrix"
      return new KollaAdapter(token, connectorId, consumerId, label)
    }
    case "opendental":
    default:
      return new OpenDentalLocalAdapter({
        host: settings.mysqlHost,
        port: settings.mysqlPort,
        user: settings.mysqlUser,
        password: settings.mysqlPassword ? decrypt(settings.mysqlPassword) : "",
        database: settings.mysqlDatabase,
      })
  }
}
