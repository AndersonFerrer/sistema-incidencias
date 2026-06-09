import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function CategoriaEstadoBadge({ activo }: { activo: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 rounded-full px-3 text-xs font-medium",
        activo
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-slate-100 text-slate-600"
      )}
    >
      {activo ? "Activo" : "Inactivo"}
    </Badge>
  )
}
