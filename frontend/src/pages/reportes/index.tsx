import { useEffect, useMemo, useRef, useState } from "react"

import { ApiError } from "@/lib/http"
import { ReporteCharts } from "@/pages/reportes/components/reporte-charts"
import { ReporteErrorAlert } from "@/pages/reportes/components/reporte-error-alert"
import { ReporteExportButtons } from "@/pages/reportes/components/reporte-export-buttons"
import {
  ReporteFiltrosForm,
  type PresetRango,
  type ReporteFiltrosFormState,
} from "@/pages/reportes/components/reporte-filtros-form"
import { ReportePreviewTable } from "@/pages/reportes/components/reporte-preview-table"
import {
  GRANULARIDADES_DISPONIBLES,
  GRANULARIDAD_POR_DEFECTO,
  RANGO_POR_DEFECTO,
} from "@/pages/reportes/data"
import {
  iniciarDescarga,
  reportesService,
} from "@/services/reportes-service"
import { usuariosService } from "@/services/usuarios-service"
import { useAuthStore } from "@/store/auth-store"
import type { Usuario } from "@/types/usuarios"
import type {
  Granularidad,
  ReporteFiltro,
  ReporteResponse,
} from "@/types/reportes"

type AgentesCargados = Usuario[] | "loading" | "hidden"

/**
 * Pagina privada `/reportes`. Carga `GET /api/reportes` con el preset
 * `30d` por defecto y refetch cuando el usuario aplica filtros. Exporta
 * PDF / XLSX con el mismo set de filtros que el preview.
 *
 * Cold load: ultimo reporte previo se mantiene visible; refetch actualiza
 * sin flashear a skeleton vacio. Error: Alert no bloqueante sin perder
 * el ultimo reporte. AbortError se ignora.
 */
export function ReportesPage() {
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.rol === "ADMINISTRADOR"
  const isAgent = user?.rol === "AGENTE"
  const showAgenteSelector = isAdmin || isAgent

  const initialState: ReporteFiltrosFormState = useMemo(
    () => ({
      preset: RANGO_POR_DEFECTO as PresetRango,
      desde: "",
      hasta: "",
      agenteId: isAgent && user?.id ? user.id : null,
      granularidad: GRANULARIDAD_POR_DEFECTO as Granularidad,
    }),
    [isAgent, user?.id]
  )

  const [state, setState] = useState<ReporteFiltrosFormState>(initialState)
  const [applied, setApplied] = useState<ReporteFiltro>(() =>
    buildFiltro(initialState, isAgent, user?.id)
  )
  const [reporte, setReporte] = useState<ReporteResponse | null>(null)
  const [agentes, setAgentes] = useState<AgentesCargados>(
    showAgenteSelector ? "loading" : "hidden"
  )
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!showAgenteSelector) {
      setAgentes("hidden")
      return
    }
    const controller = new AbortController()
    let cancelled = false
    usuariosService
      .listarAgentesAsignables(controller.signal)
      .then((lista) => {
        if (cancelled || controller.signal.aborted) return
        const filtrados =
          isAgent && user?.id
            ? lista.filter((a) => a.id === user.id)
            : lista
        setAgentes(filtrados)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || cancelled) return
        setAgentes([])
        if (err instanceof ApiError || err instanceof Error) {
          setErrorMessage(err.message)
        }
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [showAgenteSelector, isAgent, user?.id])

  useEffect(() => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    let cancelled = false
    setLoading(true)
    reportesService
      .obtener(applied, controller.signal)
      .then((payload) => {
        if (cancelled || controller.signal.aborted) return
        setReporte(payload)
        setErrorMessage(null)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || cancelled) return
        setErrorMessage(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : "No se pudo cargar el reporte."
        )
      })
      .finally(() => {
        if (!cancelled && !controller.signal.aborted) setLoading(false)
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [applied])

  const onAplicar = () =>
    setApplied(buildFiltro(state, isAgent, user?.id))

  async function descargar(formato: "pdf" | "xlsx") {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setExporting(true)
    setErrorMessage(null)
    try {
      const blob =
        formato === "pdf"
          ? await reportesService.descargarPdf(applied, controller.signal)
          : await reportesService.descargarExcel(applied, controller.signal)
      if (controller.signal.aborted) return
      iniciarDescarga(blob, `reporte.${formato}`)
    } catch (err: unknown) {
      if (controller.signal.aborted) return
      setErrorMessage(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "No se pudo generar la exportacion."
      )
    } finally {
      if (!controller.signal.aborted) setExporting(false)
    }
  }

  const granularidadLabel =
    GRANULARIDADES_DISPONIBLES.find(
      (g) => g.codigo === applied.granularidad
    )?.etiqueta ?? "Semanal"

  const agentesList: Usuario[] | undefined =
    agentes === "hidden" || agentes === "loading" ? undefined : agentes
  const includeResumenAgente =
    showAgenteSelector && agentesList && agentesList.length !== 1

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-end justify-between gap-3">
        <section className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Reportes
          </h1>
          <p className="text-xs text-slate-500">
            {user?.nombre
              ? `${user.nombre}, aqui tienes el resumen exportable del alcance de tu rol.`
              : "Resumen exportable del alcance de tu rol."}
          </p>
        </section>
        <ReporteExportButtons
          exporting={exporting}
          onExportExcel={() => descargar("xlsx")}
          onExportPdf={() => descargar("pdf")}
        />
      </header>

      <ReporteFiltrosForm
        agentes={agentesList}
        loading={loading || exporting}
        onAplicar={onAplicar}
        onChange={setState}
        state={state}
      />

      {errorMessage ? (
        <ReporteErrorAlert
          message={errorMessage}
          onDismiss={() => setErrorMessage(null)}
        />
      ) : null}

      {reporte ? (
        <div className="flex flex-col gap-3">
          <ReportesKpiBar
            kpis={reporte.kpis}
            tiempoHoras={reporte.tiempoPromedioResolucionHoras}
          />
          <ReporteCharts
            byCategoria={reporte.byCategoria}
            byEstadoProceso={reporte.kpis.byEstadoProceso}
            granularidad={granularidadLabel}
            resumenPorAgente={includeResumenAgente ? reporte.resumenPorAgente : []}
            tendencia={reporte.tendencia}
          />
          <ReportePreviewTable detalle={reporte.detalle} />
        </div>
      ) : (
        <div
          aria-busy={loading}
          aria-live="polite"
          className="rounded-lg border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm"
        >
          {loading
            ? "Cargando reporte..."
            : "Aplica un filtro para generar el reporte."}
        </div>
      )}
    </div>
  )
}

function ReportesKpiBar({
  kpis,
  tiempoHoras,
}: {
  kpis: ReporteResponse["kpis"]
  tiempoHoras: number | null
}) {
  const cards: Array<{ label: string; value: number | string }> = [
    { label: "Total Incidencias", value: kpis.total },
    { label: "Pendientes", value: kpis.byEstadoProceso.PENDIENTE ?? 0 },
    { label: "En Proceso", value: kpis.byEstadoProceso.EN_PROCESO ?? 0 },
    { label: "Finalizadas", value: kpis.byEstadoProceso.FINALIZADA ?? 0 },
  ]
  if (tiempoHoras !== null) {
    cards.push({
      label: "Tiempo Prom. (h)",
      value: tiempoHoras.toFixed(1),
    })
  }
  return (
    <section className="grid grid-cols-5 gap-5">
      {cards.map((c) => (
        <div
          className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
          key={c.label}
        >
          <p className="text-xs font-medium text-slate-500">{c.label}</p>
          <p className="text-xl font-bold text-slate-950">{c.value}</p>
        </div>
      ))}
    </section>
  )
}

/** Traduce el estado del form al `ReporteFiltro` de transporte. */
function buildFiltro(
  state: ReporteFiltrosFormState,
  isAgent: boolean,
  currentUserId: string | undefined
): ReporteFiltro {
  const base: ReporteFiltro = {
    granularidad: (state.granularidad as Granularidad) ?? GRANULARIDAD_POR_DEFECTO,
  }
  if (state.preset === "custom") {
    base.desde = state.desde || undefined
    base.hasta = state.hasta || undefined
  } else {
    base.rango = state.preset
  }
  base.agenteId = isAgent
    ? currentUserId
    : state.agenteId ?? undefined
  return base
}
