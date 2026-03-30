import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { seedMockData } from "@/lib/open-dental/mock-data"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  try {
    await seedMockData(prisma)
    return NextResponse.json({ message: "Mock data loaded successfully! Refresh the dashboard." })
  } catch (error) {
    console.error("Failed to seed mock data:", error)
    return NextResponse.json({ error: "Failed to load mock data" }, { status: 500 })
  }
}
