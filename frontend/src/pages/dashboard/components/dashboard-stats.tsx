import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Timer,
  TrendingUp,
} from "lucide-react"

import { StatCard } from "@/pages/dashboard/components/stat-card"
import type { Kpis } from "@/services/dashboard-service"

type DashboardStatsProps = {
  kpis: Kpis
  tiempoPromedioHoras: number | null
}

/**
 * Renderiza las 5-6 tarjetas KPI del dashboard a partir de los agregados del
 * backend (`kpis` + `tiempoPromedioHoras`).
 *
 * Si `tiempoPromedioHoras` es `null` (sin FINALIZADA en el scope + rango),
 * la card "Tiempo Prom." se omite (no se muestra `0.0 h` placeholder).
 */
export function DashboardStats({
  kpis,
  tiempoPromedioHoras,
}: DashboardStatsProps) {
  const byAprob = kpis.byEstadoAprobacion ?? {}
  const byProceso = kpis.byEstadoProceso ?? {}

  const cards: Array<{
    label: string
    value: string | number
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
    color: string
  }> = [
    {
      label: "Total Incidencias",
      value: kpis.total,
      icon: AlertTriangle,
      color: "text-blue-600",
    },
    {
      label: "Solicitudes por revisar",
      value: byAprob.SOLICITADA ?? 0,
      icon: AlertTriangle,
      color: "text-slate-900",
    },
    {
      label: "Pendientes",
      value: byProceso.PENDIENTE ?? 0,
      icon: Clock,
      color: "text-orange-500",
    },
    {
      label: "En Proceso",
      value: byProceso.EN_PROCESO ?? 0,
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      label: "Finalizadas",
      value: byProceso.FINALIZADA ?? 0,
      icon: CheckCircle2,
      color: "text-green-600",
    },
  ]

  if (tiempoPromedioHoras !== null) {
    cards.push({
      label: "Tiempo Prom. Resolución",
      value: formatearHoras(tiempoPromedioHoras),
      icon: Timer,
      color: "text-slate-950",
    })
  }

  return (
    <section className="grid grid-cols-5 gap-5">
      {cards.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </section>
  )
}

function formatearHoras(horas: number): string {
  if (horas < 1) return `${Math.round(horas * 60)} min`
  if (horas < 24) return `${horas.toFixed(1)} h`
  const dias = horas / 24
  return `${dias.toFixed(1)} días`
}
