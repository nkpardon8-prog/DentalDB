import cron from "node-cron"
import { prisma } from "./prisma"

let started = false

export function startSyncWorker() {
  if (started) return
  started = true

  const intervalMinutes = parseInt(process.env.SYNC_INTERVAL_MINUTES || "2", 10)
  const schedule = `*/${intervalMinutes} * * * *`

  cron.schedule(schedule, async () => {
    try {
      const settings = await prisma.officeSetting.findFirst()
      const hasCredentials = settings?.mysqlUser || settings?.kollaToken
      if (!settings?.syncEnabled || settings.dataMode !== "live" || !hasCredentials) {
        return
      }

      const { createAdapter } = await import("./adapters/factory")
      const { syncAll } = await import("./open-dental/sync")

      const adapter = createAdapter(settings)
      try {
        await syncAll(prisma, adapter)

        // Run alert checks after sync
        const { checkAlertRules } = await import("./alerts/engine")
        await checkAlertRules(prisma).catch(err =>
          console.error("Alert engine error:", err)
        )

        await prisma.officeSetting.update({
          where: { id: settings.id },
          data: { lastSyncAt: new Date() },
        })
      } finally {
        if (adapter.close) await adapter.close()
      }
    } catch (error) {
      console.error("Sync worker error:", error)
    }
  })

  console.log(`[Sync Worker] Started — syncing every ${intervalMinutes} minutes`)
}
