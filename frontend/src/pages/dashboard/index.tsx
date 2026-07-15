import { DashboardCharts } from "@/pages/dashboard/components/dashboard-charts"
import { DashboardStats } from "@/pages/dashboard/components/dashboard-stats"
import { RecentIncidentsTable } from "@/pages/dashboard/components/recent-incidents-table"
import {
  categoryData,
  incidents,
  pieData,
  recentIncidents,
  trendData,
} from "@/pages/dashboard/data"
import type { IncidenciaResumen } from "@/services/dashboard-service"
import { useAuthStore } from "@/store/auth-store"
import type { Prioridad } from "@/types/incidencias"

// Bridges the legacy mock shape in `data.ts` to the backend-shaped props
// that the components now consume. Will be removed in C3 when the page
// fetches from `/api/dashboard`.
function construirKpisDeMocks() {
  const byEstadoAprobacion: Record<string, number> = {}
  const byEstadoProceso: Record<string, number> = {}

  for (const incident of incidents) {
    switch (incident.status) {
      case "solicitada":
        byEstadoAprobacion.SOLICITADA =
          (byEstadoAprobacion.SOLICITADA ?? 0) + 1
        break
      case "aceptada":
        byEstadoAprobacion.APROBADA =
          (byEstadoAprobacion.APROBADA ?? 0) + 1
        break
      case "rechazada":
        byEstadoAprobacion.RECHAZADA =
          (byEstadoAprobacion.RECHAZADA ?? 0) + 1
        break
      case "pendiente":
        byEstadoProceso.PENDIENTE = (byEstadoProceso.PENDIENTE ?? 0) + 1
        break
      case "en_proceso":
        byEstadoProceso.EN_PROCESO = (byEstadoProceso.EN_PROCESO ?? 0) + 1
        break
      case "finalizada":
        byEstadoProceso.FINALIZADA = (byEstadoProceso.FINALIZADA ?? 0) + 1
        break
    }
  }

  return {
    total: incidents.length,
    byEstadoAprobacion,
    byEstadoProceso,
  }
}

function construirByCategoriaDeMocks() {
  return categoryData.map((item) => ({
    categoriaId: item.name,
    categoriaNombre: item.name,
    total: item.cantidad,
  }))
}

function construirTendenciaDeMocks() {
  // trendData era [{week: "14 mar", creadas: 1, resueltas: 2}]; la serie nueva
  // colapsa a un solo contador semanal.
  return trendData.map((punto) => ({
    semanaInicio: `2026-${punto.week.split(" ")[1] === "ene" ? "01" : "03"}-${punto.week.split(" ")[0].padStart(2, "0")}`,
    total: punto.creadas + punto.resueltas,
  }))
}

function construirByEstadoProcesoDeMocks(): Record<string, number> {
  // `pieData` viejo trae los 6 estados agregados; derivamos solo proceso.
  const map: Record<string, number> = {}
  for (const item of pieData) {
    if (item.name === "Pendiente") map.PENDIENTE = item.value
    else if (item.name === "En Proceso") map.EN_PROCESO = item.value
    else if (item.name === "Finalizada") map.FINALIZADA = item.value
  }
  return map
}

function construirRecientesDeMocks(): IncidenciaResumen[] {
  const mapStatus: Record<
    string,
    { estadoProcesoCodigo: string; estadoAprobacionCodigo: string }
  > = {
    solicitada: {
      estadoProcesoCodigo: "PENDIENTE",
      estadoAprobacionCodigo: "SOLICITADA",
    },
    aceptada: {
      estadoProcesoCodigo: "PENDIENTE",
      estadoAprobacionCodigo: "APROBADA",
    },
    rechazada: {
      estadoProcesoCodigo: "PENDIENTE",
      estadoAprobacionCodigo: "RECHAZADA",
    },
    pendiente: {
      estadoProcesoCodigo: "PENDIENTE",
      estadoAprobacionCodigo: "APROBADA",
    },
    en_proceso: {
      estadoProcesoCodigo: "EN_PROCESO",
      estadoAprobacionCodigo: "APROBADA",
    },
    finalizada: {
      estadoProcesoCodigo: "FINALIZADA",
      estadoAprobacionCodigo: "APROBADA",
    },
  }

  const mapPrioridad: Record<string, Prioridad> = {
    baja: "BAJA",
    media: "MEDIA",
    alta: "ALTA",
  }

  return recentIncidents.map((incident) => ({
    id: incident.id,
    codigo: incident.id,
    titulo: incident.title,
    categoriaNombre: incident.category,
    asignadoA: incident.assignedTo,
    estadoProcesoCodigo:
      mapStatus[incident.status]?.estadoProcesoCodigo ?? "PENDIENTE",
    estadoAprobacionCodigo:
      mapStatus[incident.status]?.estadoAprobacionCodigo ?? "SOLICITADA",
    prioridad: mapPrioridad[incident.priority] ?? "MEDIA",
    creadoEn: incident.createdAt,
    resueltoEn: incident.resolvedAt ?? null,
  }))
}

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const displayName = user?.nombre ?? "Invitado"

  const kpis = construirKpisDeMocks()
  const byCategoria = construirByCategoriaDeMocks()
  const tendenciaSemanal = construirTendenciaDeMocks()
  const byEstadoProceso = construirByEstadoProcesoDeMocks()
  const recientes = construirRecientesDeMocks()
  // Legacy mock fija "2.1 dias" como texto plano: lo convertimos a horas para
  // que la card siga mostrando el mismo dato despues del refactor.
  const tiempoPromedioHoras = 2.1 * 24

  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-0.5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Dashboard
        </h1>
        <p className="text-xs text-slate-500">
          Bienvenido, {displayName}. Aquí tienes el resumen de incidencias.
        </p>
      </section>

      <DashboardStats
        kpis={kpis}
        tiempoPromedioHoras={tiempoPromedioHoras}
      />
      <DashboardCharts
        byCategoria={byCategoria}
        tendenciaSemanal={tendenciaSemanal}
        byEstadoProceso={byEstadoProceso}
      />
      <RecentIncidentsTable recientes={recientes} />
    </div>
  )
}
