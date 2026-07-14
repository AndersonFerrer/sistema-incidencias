import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import type { Rol } from "@/types/roles"
import type { FilterState } from "@/pages/usuarios/types"

interface UsuariosFiltersProps {
  texto: string
  rol: string
  activo: boolean | null
  roles: Rol[]
  loadingRoles: boolean
  onChange: (next: Partial<FilterState>) => void
  onClear: () => void
}

const ACTIVO_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "Todos" },
  { value: "true", label: "Solo activos" },
  { value: "false", label: "Solo inactivos" },
]

function activoFromString(value: string): boolean | null {
  if (value === "true") return true
  if (value === "false") return false
  return null
}

function activoToString(value: boolean | null): string {
  if (value === true) return "true"
  if (value === false) return "false"
  return ""
}

export function UsuariosFilters({
  texto,
  rol,
  activo,
  roles,
  loadingRoles,
  onChange,
}: UsuariosFiltersProps) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
        />
        <Input
          type="search"
          aria-label="Buscar por nombre o email"
          placeholder="Buscar por nombre o email"
          value={texto}
          onChange={(event) => onChange({ texto: event.target.value })}
          className="h-8 pl-8 text-sm"
        />
      </div>
      <select
        aria-label="Filtrar por rol"
        value={rol}
        disabled={loadingRoles}
        onChange={(event) => onChange({ rol: event.target.value })}
        className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-slate-900 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">
          {loadingRoles ? "Cargando roles..." : "Todos los roles"}
        </option>
        {roles.map((rolItem) => (
          <option key={rolItem.id} value={rolItem.codigo}>
            {rolItem.nombre}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtrar por estado"
        value={activoToString(activo)}
        onChange={(event) => onChange({ activo: activoFromString(event.target.value) })}
        className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-slate-900 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {ACTIVO_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
