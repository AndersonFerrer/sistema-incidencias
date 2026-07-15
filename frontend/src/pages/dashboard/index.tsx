import { useEffect, useState } from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { DashboardCharts } from "@/pages/dashboard/components/dashboard-charts"
import { DashboardSkeleton } from "@/pages/dashboard/components/dashboard-skeleton"
import { DashboardStats } from "@/pages/dashboard/components/dashboard-stats"
import { RecentIncidentsTable } from "@/pages/dashboard/components/recent-incidents-table"
import { ApiError } from "@/lib/http"
import {
  dashboardService,
  RANGO_POR_DEFECTO,
  RANGOS_DISPONIBLES,
  type Dashboard,
  type Rango,
} from "@/services/dashboard-service"
import { useAuthStore } from "@/store/auth-store"

/**
 * Pagina principal del dashboard. Carga los agregados desde
 * `GET /api/dashboard?rango=<rango>` y delega el render a los componentes
 * props-driven del directorio `components/`.
 *
 * Comportamiento:
 * - Cold load (sin data previa): muestra `DashboardSkeleton` hasta el primer 200.
 * - Refetch por cambio de rango: mantiene el data anterior visible y vuelve a
 *   mostrar el skeleton solo si no hay data previa.
 * - Error: muestra un Alert no bloqueante y mantiene el ultimo data valido
 *   en pantalla (no se borra el dashboard). `AbortError` se ignora silencioso.
 */
export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const displayName = user?.nombre ?? "Invitado"

  const [rango, setRango] = useState<Rango>(RANGO_POR_DEFECTO)
  const [data, setData] = useState<Dashboard | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    dashboardService
      .obtener(rango, controller.signal)
      .then((payload) => {
        if (cancelled || controller.signal.aborted) return
        setData(payload)
        setErrorMessage(null)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || cancelled) return
        if (err instanceof ApiError || err instanceof Error) {
          setErrorMessage(err.message)
        } else {
          setErrorMessage("No se pudo cargar el dashboard.")
        }
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [rango])

  const isColdLoad = data === null

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-end justify-between gap-3">
        <section className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Bienvenido, {displayName}. Aquí tienes el resumen de incidencias.
          </p>
        </section>

        <label className="flex items-center gap-2 text-xs text-slate-500">
          <span>Rango</span>
          <select
            aria-label="Rango temporal del dashboard"
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            onChange={(e) => setRango(e.target.value as Rango)}
            value={rango}
          >
            {RANGOS_DISPONIBLES.map((opcion) => (
              <option key={opcion.codigo} value={opcion.codigo}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </label>
      </header>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>No se pudo cargar el dashboard</AlertTitle>
          <AlertDescription>
            {errorMessage}. Se mantiene el último estado válido en pantalla.
          </AlertDescription>
        </Alert>
      ) : null}

      {isColdLoad ? (
        <DashboardSkeleton />
      ) : (
        <>
          <DashboardStats
            kpis={data.kpis}
            tiempoPromedioHoras={data.tiempoPromedioResolucionHoras}
          />
          <DashboardCharts
            byCategoria={data.byCategoria}
            tendenciaSemanal={data.tendenciaSemanal}
            byEstadoProceso={data.kpis.byEstadoProceso}
          />
          <RecentIncidentsTable recientes={data.recientes} />
        </>
      )}
    </div>
  )
}
