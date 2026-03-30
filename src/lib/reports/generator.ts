import PDFDocument from "pdfkit"

interface ColumnDef {
  header: string
  key: string
  width: number
  align?: "left" | "right" | "center"
  format?: "currency" | "hours" | "number"
}

interface ReportConfig {
  title: string
  subtitle: string
  columns: ColumnDef[]
  rows: Record<string, any>[]
  summary?: Record<string, any>
}

export function generateReport(config: ReportConfig): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "letter" })
    const chunks: Uint8Array[] = []
    doc.on("data", (chunk) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    // Header
    doc.fontSize(18).font("Helvetica-Bold").text(config.title, { align: "center" })
    doc.fontSize(10).font("Helvetica").text(config.subtitle, { align: "center" })
    doc.moveDown(1.5)

    // Table header
    renderTableHeader(doc, config.columns)

    // Rows with auto page breaks
    for (const row of config.rows) {
      if (doc.y > 700) {
        doc.addPage()
        renderTableHeader(doc, config.columns)
      }
      renderTableRow(doc, config.columns, row, false)
    }

    // Summary row
    if (config.summary) {
      doc.moveDown(0.5)
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke()
      doc.moveDown(0.5)
      renderTableRow(doc, config.columns, config.summary, true)
    }

    // Footer
    doc
      .fontSize(8)
      .font("Helvetica")
      .text(
        `Generated ${new Date().toLocaleString()} — Dental Admin Dashboard`,
        50,
        740,
        { align: "center", width: 512 }
      )

    doc.end()
  })
}

function renderTableHeader(doc: PDFKit.PDFDocument, columns: ColumnDef[]): void {
  const y = doc.y
  let x = 50

  // Background
  doc.save()
  doc.rect(50, y - 2, 512, 20).fill("#f3f4f6")
  doc.restore()

  doc.fontSize(9).font("Helvetica-Bold").fillColor("#374151")

  for (const col of columns) {
    const align = col.align || "left"
    const textX = align === "right" ? x + col.width - 4 : align === "center" ? x + col.width / 2 : x + 4
    const textOptions: any = { width: col.width - 8 }
    if (align === "right") {
      textOptions.align = "right"
    } else if (align === "center") {
      textOptions.align = "center"
    }
    doc.text(col.header.toUpperCase(), align === "right" ? x : align === "center" ? x : textX, y + 2, textOptions)
    x += col.width
  }

  doc.y = y + 22

  // Underline
  doc.moveTo(50, doc.y).lineTo(562, doc.y).lineWidth(0.5).strokeColor("#d1d5db").stroke()
  doc.y += 4
  doc.fillColor("#000000")
}

function renderTableRow(
  doc: PDFKit.PDFDocument,
  columns: ColumnDef[],
  row: Record<string, any>,
  isSummary: boolean
): void {
  const y = doc.y
  let x = 50

  doc.fontSize(9).font(isSummary ? "Helvetica-Bold" : "Helvetica").fillColor("#111827")

  for (const col of columns) {
    const raw = row[col.key]
    const formatted = formatValue(raw, col.format)
    const align = col.align || "left"
    const textOptions: any = { width: col.width - 8 }
    if (align === "right") {
      textOptions.align = "right"
    } else if (align === "center") {
      textOptions.align = "center"
    }
    doc.text(formatted, x + (align === "left" ? 4 : 0), y, textOptions)
    x += col.width
  }

  doc.y = y + 16
}

function formatValue(value: any, format?: "currency" | "hours" | "number"): string {
  if (value === null || value === undefined) return "—"

  switch (format) {
    case "currency": {
      const num = typeof value === "number" ? value : parseFloat(value)
      if (isNaN(num)) return "$0.00"
      return (
        "$" +
        num.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      )
    }
    case "hours": {
      const num = typeof value === "number" ? value : parseFloat(value)
      if (isNaN(num)) return "0h 0m"
      const h = Math.floor(num)
      const m = Math.round((num - h) * 60)
      if (m === 0) return `${h}h`
      return `${h}h ${m}m`
    }
    case "number": {
      const num = typeof value === "number" ? value : parseFloat(value)
      if (isNaN(num)) return "0"
      return num.toLocaleString("en-US")
    }
    default:
      return String(value)
  }
}
