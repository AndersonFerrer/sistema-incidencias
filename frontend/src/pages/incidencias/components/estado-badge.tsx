import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { EstadoAprobacion } from "@/types/estados-aprobacion"

const aprobacionStyles: Record<string, string> = {
  SOLICITADA: "border-slate-200 bg-slate-100 text-slate-700",
  APROBADA: "border-blue-200 bg-blue-50 text-blue-700",
  ACEPTADA: "border-blue-200 bg-blue-50 text-blue-700",
  RECHAZADA: "border-red-200 bg-red-50 text-red-700",
}

const aprobacionLabels: Record<string, string> = {
  SOLICITADA: "Solicitada",
  APROBADA: "Aprobada",
  ACEPTADA: "Aceptada",
  RECHAZADA: "Rechazada",
}

export function EstadoAprobacionBadge({
  estado,
}: {
  estado: EstadoAprobacion
}) {
  const fallbackStyle = "border-slate-200 bg-slate-100 text-slate-700"
  const fallbackLabel = estado.clave

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-7 px-3",
        aprobacionStyles[estado.clave] ?? fallbackStyle
      )}
    >
      {aprobacionLabels[estado.clave] ?? fallbackLabel}
    </Badge>
  )
}
