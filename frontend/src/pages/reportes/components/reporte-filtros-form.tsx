import { Button } from "@/components/ui/button"
import { GRANULARIDADES_DISPONIBLES, RANGOS_DISPONIBLES } from "@/pages/reportes/data"
import type { Usuario } from "@/types/usuarios"

/**
 * Rango efectivo que envia la pagina al backend. `custom` se expande a
 * `desde` + `hasta` explicitos (no se envia como query param).
 */
export type PresetRango = "7d" | "30d" | "90d" | "all" | "custom"

export type ReporteFiltrosFormState = {
  preset: PresetRango
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
  agentes?: Usuario[]
  loading?: boolean
}

/**
 * Form de filtros del reporte. Stateless: el padre (pagina `/reportes`)
 * controla los valores via `state` + `onChange`. Pulsa `Aplicar` para
 * disparar la refetch.
 *
 * Comportamiento:
 * - Preset `custom` muestra los inputs `desde` / `hasta` nativos (ISO
 *   `YYYY-MM-DD`, sin locale).
 * - Selector de agente oculto para USUARIO (no recibe la lista).
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
  ) => {
    onChange({ ...state, [key]: value })
  }

  const showCustomDates = state.preset === "custom"
  const showAgente = Array.isArray(agentes)

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
          onChange={(e) => update("preset", e.target.value as PresetRango)}
          value={state.preset}
        >
          {RANGOS_DISPONIBLES.map((opcion) => (
            <option key={opcion.codigo} value={opcion.codigo}>
              {opcion.etiqueta}
            </option>
          ))}
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

      {showAgente ? (
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          <span>Agente</span>
          <select
            aria-label="Agente"
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            disabled={agentes!.length <= 1}
            onChange={(e) =>
              update("agenteId", e.target.value === "" ? null : e.target.value)
            }
            value={state.agenteId ?? ""}
          >
            <option value="">Todos los agentes</option>
            {agentes!.map((agente) => (
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
          {GRANULARIDADES_DISPONIBLES.map((opcion) => (
            <option key={opcion.codigo} value={opcion.codigo}>
              {opcion.etiqueta}
            </option>
          ))}
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
