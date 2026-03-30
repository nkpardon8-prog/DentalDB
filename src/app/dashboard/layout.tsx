import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { DemoBanner } from "@/components/dashboard/demo-banner"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-60">
        <DemoBanner />
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
