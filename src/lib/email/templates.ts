interface EmployeeHoursRow {
  name: string
  hours: number
}

interface DailyReportData {
  officeName: string
  date: string
  employeesWorked: number
  totalHours: number
  totalProduction: number
  appointmentsCompleted: number
  appointmentsTotal: number
  claimsSent: number
  employeeHours: EmployeeHoursRow[]
}

export function dailyReportEmail(data: DailyReportData): string {
  const employeeRows = data.employeeHours
    .map(
      (e) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">${e.name}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; text-align: right;">${formatHours(e.hours)}</td>
      </tr>`
    )
    .join("")

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1e40af; padding: 24px 32px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">${data.officeName}</h1>
              <p style="margin: 4px 0 0; color: #bfdbfe; font-size: 14px;">Daily Production Report &mdash; ${data.date}</p>
            </td>
          </tr>

          <!-- Summary Stats -->
          <tr>
            <td style="padding: 24px 32px 0;">
              <h2 style="margin: 0 0 16px; font-size: 16px; color: #111827; font-weight: 600;">Summary</h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 12px; background-color: #eff6ff; border-radius: 6px; text-align: center; width: 33%;">
                    <div style="font-size: 22px; font-weight: 700; color: #1e40af;">${data.employeesWorked}</div>
                    <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Employees Worked</div>
                  </td>
                  <td width="12"></td>
                  <td style="padding: 12px; background-color: #f0fdf4; border-radius: 6px; text-align: center; width: 33%;">
                    <div style="font-size: 22px; font-weight: 700; color: #16a34a;">${formatHours(data.totalHours)}</div>
                    <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Total Hours</div>
                  </td>
                  <td width="12"></td>
                  <td style="padding: 12px; background-color: #fefce8; border-radius: 6px; text-align: center; width: 33%;">
                    <div style="font-size: 22px; font-weight: 700; color: #ca8a04;">${formatCurrency(data.totalProduction)}</div>
                    <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Production</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 16px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 12px; background-color: #f9fafb; border-radius: 6px; text-align: center; width: 50%;">
                    <div style="font-size: 22px; font-weight: 700; color: #374151;">${data.appointmentsCompleted}/${data.appointmentsTotal}</div>
                    <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Appointments Completed</div>
                  </td>
                  <td width="12"></td>
                  <td style="padding: 12px; background-color: #f9fafb; border-radius: 6px; text-align: center; width: 50%;">
                    <div style="font-size: 22px; font-weight: 700; color: #374151;">${data.claimsSent}</div>
                    <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Claims Sent</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Employee Hours Table -->
          <tr>
            <td style="padding: 24px 32px;">
              <h2 style="margin: 0 0 12px; font-size: 16px; color: #111827; font-weight: 600;">Employee Hours</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Employee</th>
                  <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Hours</th>
                </tr>
                ${employeeRows}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                Generated by Dental Admin Dashboard &mdash; ${new Date().toLocaleString()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function formatCurrency(value: number): string {
  return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatHours(totalHours: number): string {
  const h = Math.floor(totalHours)
  const m = Math.round((totalHours - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
