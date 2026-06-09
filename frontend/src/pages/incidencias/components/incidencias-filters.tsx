import { Search, Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AplicativoCliente } from "@/types/aplicativos"
import type { Categoria } from "@/types/categorias"
import type { EstadoAprobacion } from "@/types/estados-aprobacion"
import type { EstadoProceso } from "@/types/estados-proceso"
import type { Prioridad } from "@/types/incidencias"

export type IncidenciasFiltrosValues = {
  texto: string
  estadoProcesoId: string
  categoriaId: string
  prioridad: Prioridad | ""
  clienteId: string
  estadoAprobacionId: string
  desde: string
  hasta: string
}

type IncidenciasFiltersProps = {
  values: IncidenciasFiltrosValues
  onChange: (values: IncidenciasFiltrosValues) => void
  estadosProceso: EstadoProceso[]
  categorias: Categoria[]
  aplicativos: AplicativoCliente[]
  estadosAprobacion: EstadoAprobacion[]
}

const PRIORIDADES: Prioridad[] = ["BAJA", "MEDIA", "ALTA", "CRITICA"]

const inputClass =
  "h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-slate-900 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function IncidenciasFilters({
  values,
  onChange,
  estadosProceso,
  categorias,
  aplicativos,
  estadosAprobacion,
}: IncidenciasFiltersProps) {
  const set = <K extends keyof IncidenciasFiltrosValues>(
    key: K,
    value: IncidenciasFiltrosValues[K]
  ) => {
    onChange({ ...values, [key]: value })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(5,minmax(0,1fr))]">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
          />
          <Input
            type="search"
            placeholder="Buscar por título, descripción o ID"
            value={values.texto}
            onChange={(event) => set("texto", event.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>

        <select
          aria-label="Estado de proceso"
          value={values.estadoProcesoId}
          onChange={(event) => set("estadoProcesoId", event.target.value)}
          className={inputClass}
        >
          <option value="">Todos los estados</option>
          {estadosProceso.map((estado) => (
            <option key={estado.id} value={estado.id}>
              {estado.etiqueta}
            </option>
          ))}
        </select>

        <select
          aria-label="Categoría"
          value={values.categoriaId}
          onChange={(event) => set("categoriaId", event.target.value)}
          className={inputClass}
        >
          <option value="">Todas</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nombre}
            </option>
          ))}
        </select>

        <select
          aria-label="Prioridad"
          value={values.prioridad}
          onChange={(event) =>
            set("prioridad", event.target.value as Prioridad | "")
          }
          className={inputClass}
        >
          <option value="">Todas</option>
          {PRIORIDADES.map((prioridad) => (
            <option key={prioridad} value={prioridad}>
              {prioridad.charAt(0) + prioridad.slice(1).toLowerCase()}
            </option>
          ))}
        </select>

        <select
          aria-label="Cliente"
          value={values.clienteId}
          onChange={(event) => set("clienteId", event.target.value)}
          className={inputClass}
        >
          <option value="">Todos los clientes</option>
          {aplicativos.map((aplicativo) => (
            <option key={aplicativo.id} value={aplicativo.id}>
              {aplicativo.nombre}
            </option>
          ))}
        </select>

        <select
          aria-label="Estado de aprobación"
          value={values.estadoAprobacionId}
          onChange={(event) => set("estadoAprobacionId", event.target.value)}
          className={inputClass}
        >
          <option value="">Todas</option>
          {estadosAprobacion.map((estado) => (
            <option key={estado.id} value={estado.id}>
              {estado.etiqueta}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
        <div className="relative">
          <Input
            type="date"
            aria-label="Fecha desde"
            value={values.desde}
            onChange={(event) => set("desde", event.target.value)}
            className="h-8 pr-7 text-sm"
          />
          <Calendar
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
          />
        </div>
        <div className="relative">
          <Input
            type="date"
            aria-label="Fecha hasta"
            value={values.hasta}
            onChange={(event) => set("hasta", event.target.value)}
            className="h-8 pr-7 text-sm"
          />
          <Calendar
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-3"
          onClick={() =>
            onChange({
              texto: "",
              estadoProcesoId: "",
              categoriaId: "",
              prioridad: "",
              clienteId: "",
              estadoAprobacionId: "",
              desde: "",
              hasta: "",
            })
          }
        >
          Limpiar filtros
        </Button>
      </div>
    </div>
  )
}
