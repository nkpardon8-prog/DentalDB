import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)))
    const employeeId = searchParams.get("employeeId")
    const permType = searchParams.get("permType")
    const search = searchParams.get("search")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const where: Prisma.SecurityLogWhereInput = {}

    if (employeeId) {
      where.employeeId = parseInt(employeeId, 10)
    }

    if (permType) {
      where.permType = permType
    }

    if (search) {
      where.logText = { contains: search }
    }

    if (dateFrom || dateTo) {
      where.logDateTime = {}
      if (dateFrom) {
        where.logDateTime.gte = new Date(dateFrom)
      }
      if (dateTo) {
        // Include the entire end date by going to end of day
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        where.logDateTime.lte = endDate
      }
    }

    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      prisma.securityLog.findMany({
        where,
        include: { employee: true },
        orderBy: { logDateTime: "desc" },
        skip,
        take: limit,
      }),
      prisma.securityLog.count({ where }),
    ])

    return NextResponse.json({ logs, total, page, limit })
  } catch (error) {
    console.error("Activity API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    )
  }
}
