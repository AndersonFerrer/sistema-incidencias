import { Shield } from "lucide-react"

export function AppLogo() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-[14px] bg-primary text-primary-foreground shadow-sm">
        <Shield aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold leading-tight text-foreground">
          GestIncidencias
        </h1>
        <p className="text-xs text-muted-foreground">
          Sistema de Gestión de Incidencias
        </p>
      </div>
    </div>
  )
}
