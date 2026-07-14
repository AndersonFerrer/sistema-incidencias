import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

interface UsuariosHeaderProps {
  total: number
  onNuevo: () => void
  loading?: boolean
}

export function UsuariosHeader({
  total,
  onNuevo,
  loading = false,
}: UsuariosHeaderProps) {
  const counterText = loading
    ? "Cargando usuarios..."
    : `${total} ${total === 1 ? "usuario registrado" : "usuarios registrados"}`

  return (
    <header className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Gestión de Usuarios
        </h1>
        <p className="text-xs text-slate-500">{counterText}</p>
      </div>
      <Button
        type="button"
        size="default"
        className="h-8 px-3"
        onClick={onNuevo}
      >
        <Plus data-icon="inline-start" className="size-3.5" />
        Nuevo Usuario
      </Button>
    </header>
  )
}
