import { dashboardStats } from "@/pages/dashboard/data"
import { StatCard } from "@/pages/dashboard/components/stat-card"

export function DashboardStats() {
  return (
    <section className="grid grid-cols-5 gap-5">
      {dashboardStats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </section>
  )
}
