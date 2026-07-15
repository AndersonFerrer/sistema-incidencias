import { Button } from "@/components/ui/button"

type ReporteFiltrosFormState = {
  preset: "7d" | "30d" | "90d" | "all" | "custom"
  desde: string
  hasta: string
  agenteId: string | null
  granularidad: string
}

type ReporteFiltrosFormProps = {
  state: ReporteFiltrosFormState
  onChange: (state: ReporteFiltrosFormState) => void
  onAplicar: () => void
  /** Lista de agentes asignables segun el rol; undefined oculta el selector. */
  agentes?: { id: string; nombre: string }[]
  loading?: boolean
}

/**
 * Form de filtros del reporte. Stateless: el padre (pagina `/reportes`)
 * controla los valores via `state` + `onChange`. Pulsa `Aplicar` para
 * disparar la refetch.
 *
 * - Preset `custom` muestra los inputs `desde`/`hasta` nativos (ISO).
 * - Selector de agente solo se muestra si llega `agentes[]`.
 * - Granularidad default `Semanal` (alineado con el backend).
 */
export function ReporteFiltrosForm({
  state,
  onChange,
  onAplicar,
  agentes,
  loading,
}: ReporteFiltrosFormProps) {
  const update = <K extends keyof ReporteFiltrosFormState>(
    key: K,
    value: ReporteFiltrosFormState[K]
  ) => onChange({ ...state, [key]: value })

  const showCustomDates = state.preset === "custom"

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault()
        onAplicar()
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
        <span>Periodo</span>
        <select
          aria-label="Periodo del reporte"
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          onChange={(e) => update("preset", e.target.value as ReporteFiltrosFormState["preset"])}
          value={state.preset}
        >
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
          <option value="90d">Últimos 90 días</option>
          <option value="all">Todo el histórico</option>
          <option value="custom">Rango personalizado</option>
        </select>
      </label>

      {showCustomDates ? (
        <>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            <span>Desde</span>
            <input
              aria-label="Fecha de inicio"
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              onChange={(e) => update("desde", e.target.value)}
              type="date"
              value={state.desde}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            <span>Hasta</span>
            <input
              aria-label="Fecha de fin"
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              onChange={(e) => update("hasta", e.target.value)}
              type="date"
              value={state.hasta}
            />
          </label>
        </>
      ) : null}

      {Array.isArray(agentes) ? (
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          <span>Agente</span>
          <select
            aria-label="Agente"
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            disabled={agentes.length <= 1}
            onChange={(e) =>
              update("agenteId", e.target.value === "" ? null : e.target.value)
            }
            value={state.agenteId ?? ""}
          >
            <option value="">Todos los agentes</option>
            {agentes.map((agente) => (
              <option key={agente.id} value={agente.id}>
                {agente.nombre}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
        <span>Granularidad</span>
        <select
          aria-label="Granularidad de la tendencia"
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          onChange={(e) => update("granularidad", e.target.value)}
          value={state.granularidad}
        >
          <option value="DIARIA">Diaria</option>
          <option value="SEMANAL">Semanal</option>
          <option value="MENSUAL">Mensual</option>
        </select>
      </label>

      <Button
        aria-label="Aplicar filtros"
        className="h-9 px-4"
        disabled={loading}
        type="submit"
      >
        Aplicar
      </Button>
    </form>
  )
}

export type { ReporteFiltrosFormState }
export type PresetRango = "7d" | "30d" | "90d" | "all" | "custom"
