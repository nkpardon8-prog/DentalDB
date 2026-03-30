import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const dismissed = searchParams.get("dismissed")
  const type = searchParams.get("type")

  const where: Record<string, unknown> = {}

  if (dismissed === "true") {
    where.dismissed = true
  } else if (dismissed === "false") {
    where.dismissed = false
    where.autoResolved = false
  }

  if (type && type !== "all") {
    where.type = type
  }

  const alerts = await prisma.alert.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  })

  return NextResponse.json({ alerts })
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { id, dismissAll } = body

  if (dismissAll) {
    await prisma.alert.updateMany({
      where: { dismissed: false },
      data: { dismissed: true },
    })
    return NextResponse.json({ success: true })
  }

  if (!id) {
    return NextResponse.json({ error: "Missing alert id" }, { status: 400 })
  }

  const alert = await prisma.alert.update({
    where: { id },
    data: { dismissed: true },
  })

  return NextResponse.json({ alert })
}
