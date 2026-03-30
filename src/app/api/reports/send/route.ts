import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createTransporter } from "@/lib/email/transport"
import { dailyReportEmail } from "@/lib/email/templates"
import { generateReport } from "@/lib/reports/generator"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const body = await req.json()
  const { reportType, date, dateFrom, dateTo } = body

  if (!reportType || !["daily", "weekly", "payroll"].includes(reportType)) {
    return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
  }

  // Get email settings
  const emailSettings = await prisma.emailSetting.findFirst()
  if (!emailSettings?.smtpHost || !emailSettings?.reportRecipients) {
    return NextResponse.json(
      { error: "Email not configured. Set up SMTP and recipients in Settings." },
      { status: 400 }
    )
  }

  const transporter = await createTransporter()
  if (!transporter) {
    return NextResponse.json({ error: "Failed to create email transporter" }, { status: 500 })
  }

  const officeSetting = await prisma.officeSetting.findFirst()
  const officeName = officeSetting?.officeName || "Dental Office"

  try {
    // Generate the PDF by calling the appropriate report endpoint internally
    const baseUrl = req.nextUrl.origin
    let reportUrl: string
    let filename: string
    let subject: string

    switch (reportType) {
      case "daily": {
        const d = date || new Date().toISOString().slice(0, 10)
        reportUrl = `${baseUrl}/api/reports/daily?date=${d}`
        filename = `daily-report-${d}.pdf`
        subject = `${officeName} — Daily Production Report (${d})`
        break
      }
      case "weekly": {
        reportUrl = `${baseUrl}/api/reports/weekly`
        filename = `weekly-summary-${new Date().toISOString().slice(0, 10)}.pdf`
        subject = `${officeName} — Weekly Summary`
        break
      }
      case "payroll": {
        const from = dateFrom || new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10)
        const to = dateTo || new Date().toISOString().slice(0, 10)
        reportUrl = `${baseUrl}/api/reports/payroll?dateFrom=${from}&dateTo=${to}`
        filename = `payroll-report-${from}-to-${to}.pdf`
        subject = `${officeName} — Payroll Report (${from} to ${to})`
        break
      }
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }

    // Fetch the PDF using internal request with cookies forwarded for auth
    const cookieHeader = req.headers.get("cookie") || ""
    const pdfRes = await fetch(reportUrl, {
      headers: { cookie: cookieHeader },
    })

    if (!pdfRes.ok) {
      return NextResponse.json({ error: "Failed to generate report PDF" }, { status: 500 })
    }

    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())

    // Build email HTML body for daily reports, plain text for others
    let htmlBody: string
    if (reportType === "daily") {
      // Gather summary data for the email template
      const targetDate = date ? new Date(date + "T00:00:00") : new Date()
      const dayStart = new Date(targetDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(targetDate)
      dayEnd.setHours(23, 59, 59, 999)

      const clockEvents = await prisma.clockEvent.findMany({
        where: { timeIn: { gte: dayStart, lte: dayEnd } },
        include: { employee: true },
      })

      const empMap = new Map<number, { name: string; hours: number }>()
      for (const ev of clockEvents) {
        const existing = empMap.get(ev.employeeId) || {
          name: `${ev.employee.firstName} ${ev.employee.lastName}`,
          hours: 0,
        }
        if (ev.timeOut) {
          existing.hours +=
            (new Date(ev.timeOut).getTime() - new Date(ev.timeIn).getTime()) / (1000 * 60 * 60)
        }
        empMap.set(ev.employeeId, existing)
      }

      const employeeHours = Array.from(empMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      )

      const procs = await prisma.procedureLog.aggregate({
        where: { procDate: { gte: dayStart, lte: dayEnd }, procStatus: "C" },
        _sum: { procFee: true },
      })

      const appts = await prisma.appointment.findMany({
        where: { aptDateTime: { gte: dayStart, lte: dayEnd } },
      })

      const claimsSent = await prisma.claim.count({
        where: { dateSent: { gte: dayStart, lte: dayEnd } },
      })

      htmlBody = dailyReportEmail({
        officeName,
        date: dayStart.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        employeesWorked: empMap.size,
        totalHours: employeeHours.reduce((s, e) => s + e.hours, 0),
        totalProduction: procs._sum.procFee || 0,
        appointmentsCompleted: appts.filter((a) => a.aptStatus === "Complete").length,
        appointmentsTotal: appts.length,
        claimsSent,
        employeeHours,
      })
    } else {
      htmlBody = `<p>Please find the attached ${reportType} report.</p><p>— ${officeName} Dental Admin Dashboard</p>`
    }

    const recipients = emailSettings.reportRecipients
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)

    await transporter.sendMail({
      from: emailSettings.smtpFrom || emailSettings.smtpUser,
      to: recipients.join(", "),
      subject,
      html: htmlBody,
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    })

    return NextResponse.json({ message: "Report sent successfully" })
  } catch (err: any) {
    console.error("Failed to send report email:", err)
    return NextResponse.json(
      { error: `Failed to send email: ${err.message || "Unknown error"}` },
      { status: 500 }
    )
  }
}
