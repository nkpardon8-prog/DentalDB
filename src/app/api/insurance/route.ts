import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay, subDays } from "date-fns"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status") ?? "all"
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)))
    const skip = (page - 1) * limit

    const thirtyDaysAgo = subDays(startOfDay(new Date()), 30)
    const todayStart = startOfDay(new Date())

    // Build where clause based on status filter
    let where: Record<string, unknown> = {}

    switch (statusFilter) {
      case "verified":
        where = {
          dateLastVerified: {
            not: null,
            gte: thirtyDaysAgo,
          },
        }
        break
      case "overdue":
        where = {
          OR: [
            { dateLastVerified: null },
            { dateLastVerified: { lt: thirtyDaysAgo } },
          ],
        }
        break
      case "pending":
        where = {
          dateTimeEntry: { not: null },
          dateLastVerified: null,
        }
        break
      case "all":
      default:
        break
    }

    // Fetch verifications with pagination
    const [verifications, total] = await Promise.all([
      prisma.insVerification.findMany({
        where,
        orderBy: { id: "desc" },
        skip,
        take: limit,
      }),
      prisma.insVerification.count({ where }),
    ])

    // Lookup assigned user names from UserOd table
    const assignedToNums = [
      ...new Set(
        verifications
          .filter((v) => v.assignedTo != null)
          .map((v) => v.assignedTo as number)
      ),
    ]

    const userOds =
      assignedToNums.length > 0
        ? await prisma.userOd.findMany({
            where: { userNum: { in: assignedToNums } },
            select: { userNum: true, userName: true },
          })
        : []

    const userNameMap = new Map(userOds.map((u) => [u.userNum, u.userName]))

    // Enrich verifications with userName and computed status
    const enriched = verifications.map((v) => {
      let status: "Verified" | "Pending" | "Overdue"
      if (v.dateLastVerified && new Date(v.dateLastVerified) >= thirtyDaysAgo) {
        status = "Verified"
      } else if (v.dateTimeEntry && !v.dateLastVerified) {
        status = "Pending"
      } else {
        status = "Overdue"
      }

      return {
        ...v,
        status,
        assignedToName: v.assignedTo ? userNameMap.get(v.assignedTo) ?? null : null,
      }
    })

    // Compute summary counts (across all records, not just current page)
    const allVerifications = await prisma.insVerification.findMany({
      select: { dateLastVerified: true, dateTimeEntry: true },
    })

    let totalPending = 0
    let verifiedToday = 0
    let overdue = 0

    for (const v of allVerifications) {
      if (v.dateTimeEntry && !v.dateLastVerified) {
        totalPending++
      }
      if (v.dateLastVerified && new Date(v.dateLastVerified) >= todayStart) {
        verifiedToday++
      }
      if (
        !v.dateLastVerified ||
        new Date(v.dateLastVerified) < thirtyDaysAgo
      ) {
        overdue++
      }
    }

    return NextResponse.json({
      verifications: enriched,
      total,
      summary: {
        totalPending,
        verifiedToday,
        overdue,
      },
    })
  } catch (error) {
    console.error("Insurance verification API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch insurance verifications" },
      { status: 500 }
    )
  }
}
