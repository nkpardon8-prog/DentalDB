import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { encrypt } from "@/lib/crypto"
import { createTransporter } from "@/lib/email/transport"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const settings = await prisma.emailSetting.findFirst()

  return NextResponse.json({
    settings: settings
      ? {
          smtpHost: settings.smtpHost,
          smtpPort: settings.smtpPort,
          smtpUser: settings.smtpUser,
          smtpFrom: settings.smtpFrom,
          reportRecipients: settings.reportRecipients,
          dailyReportEnabled: settings.dailyReportEnabled,
          dailyReportTime: settings.dailyReportTime,
          alertEmailEnabled: settings.alertEmailEnabled,
          // Never return smtpPassword
          hasPassword: !!settings.smtpPassword,
        }
      : null,
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const body = await req.json()

  // Handle test email action
  if (body.action === "test") {
    const transporter = await createTransporter()
    if (!transporter) {
      return NextResponse.json(
        { error: "SMTP not configured. Save settings first." },
        { status: 400 }
      )
    }

    const emailSettings = await prisma.emailSetting.findFirst()
    if (!emailSettings) {
      return NextResponse.json({ error: "Email settings not found" }, { status: 400 })
    }

    const recipients = emailSettings.reportRecipients
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No recipients configured. Add at least one email address." },
        { status: 400 }
      )
    }

    try {
      await transporter.sendMail({
        from: emailSettings.smtpFrom || emailSettings.smtpUser,
        to: recipients.join(", "),
        subject: "Dental Admin Dashboard — Test Email",
        html: `
          <div style="font-family: sans-serif; padding: 24px;">
            <h2 style="color: #1e40af;">Test Email Successful</h2>
            <p>Your SMTP configuration is working correctly.</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
              Sent from Dental Admin Dashboard at ${new Date().toLocaleString()}
            </p>
          </div>
        `,
      })
      return NextResponse.json({ message: "Test email sent successfully" })
    } catch (err: any) {
      console.error("Test email failed:", err)
      return NextResponse.json(
        { error: `Failed to send test email: ${err.message || "Unknown error"}` },
        { status: 500 }
      )
    }
  }

  // Save email settings
  const {
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPassword,
    smtpFrom,
    reportRecipients,
    dailyReportEnabled,
    dailyReportTime,
    alertEmailEnabled,
  } = body

  const data: any = {}
  if (smtpHost !== undefined) data.smtpHost = smtpHost
  if (smtpPort !== undefined) data.smtpPort = Number(smtpPort)
  if (smtpUser !== undefined) data.smtpUser = smtpUser
  if (smtpPassword) data.smtpPassword = encrypt(smtpPassword)
  if (smtpFrom !== undefined) data.smtpFrom = smtpFrom
  if (reportRecipients !== undefined) data.reportRecipients = reportRecipients
  if (dailyReportEnabled !== undefined) data.dailyReportEnabled = dailyReportEnabled
  if (dailyReportTime !== undefined) data.dailyReportTime = dailyReportTime
  if (alertEmailEnabled !== undefined) data.alertEmailEnabled = alertEmailEnabled

  const existing = await prisma.emailSetting.findFirst()

  if (existing) {
    await prisma.emailSetting.update({
      where: { id: existing.id },
      data,
    })
  } else {
    await prisma.emailSetting.create({
      data: {
        id: "default",
        ...data,
      },
    })
  }

  return NextResponse.json({ message: "Email settings saved successfully" })
}
