import { DashboardCharts } from "@/pages/dashboard/components/dashboard-charts"
import { DashboardStats } from "@/pages/dashboard/components/dashboard-stats"
import { RecentIncidentsTable } from "@/pages/dashboard/components/recent-incidents-table"
import { useAuthStore } from "@/store/auth-store"

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const displayName = user?.nombre ?? "Carlos Méndez"

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Dashboard
        </h1>
        <p className="text-base text-slate-500">
          Bienvenido, {displayName}. Aquí tienes el resumen de incidencias.
        </p>
      </section>

      <DashboardStats />
      <DashboardCharts />
      <RecentIncidentsTable />
    </div>
  )
}
