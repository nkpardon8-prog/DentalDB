export async function register() {
  // Skip sync worker in serverless environments (Netlify, Vercel)
  if (process.env.NETLIFY || process.env.VERCEL) return

  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Start the sync worker (node-cron) in the server process
    const { startSyncWorker } = await import("@/lib/sync-worker")
    startSyncWorker()
  }
}
