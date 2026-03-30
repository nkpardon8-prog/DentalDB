import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"

export async function createTransporter(): Promise<Transporter | null> {
  const settings = await prisma.emailSetting.findFirst()
  if (!settings?.smtpHost || !settings?.smtpUser) return null

  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPassword ? decrypt(settings.smtpPassword) : "",
    },
  })
}
