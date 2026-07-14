import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

interface IncidenciasHeaderProps {
  totalShown: number
  onNueva: () => void
  loading?: boolean
  errorMessage?: string | null
}

export function IncidenciasHeader({
  totalShown,
  onNueva,
  loading = false,
  errorMessage,
}: IncidenciasHeaderProps) {
  const counterText = errorMessage
    ? errorMessage
    : loading
      ? "Cargando incidencias..."
      : `${totalShown} ${
          totalShown === 1 ? "incidencia encontrada" : "incidencias encontradas"
        }`

  return (
    <header className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Incidencias
        </h1>
        <p className="text-xs text-slate-500">{counterText}</p>
      </div>
      <Button
        type="button"
        size="default"
        className="h-8 px-3"
        onClick={onNueva}
      >
        <Plus data-icon="inline-start" className="size-3.5" />
        Nueva Incidencia
      </Button>
    </header>
  )
}