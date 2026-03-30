export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Start the sync worker (node-cron) in the server process
    const { startSyncWorker } = await import("@/lib/sync-worker")
    startSyncWorker()
  }
}
