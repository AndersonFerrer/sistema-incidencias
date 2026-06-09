import { Check, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import type { Usuario } from "@/types/usuarios"

type IncidenciaRevisionCardProps = {
  estadoAprobacionClave: string
  solicitante: Usuario | null
  isSubmitting: boolean
  onAceptar: () => void
  onRechazar: () => void
}

export function IncidenciaRevisionCard({
  estadoAprobacionClave,
  solicitante,
  isSubmitting,
  onAceptar,
  onRechazar,
}: IncidenciaRevisionCardProps) {
  if (estadoAprobacionClave === "RECHAZADA") {
    return null
  }

  if (estadoAprobacionClave !== "SOLICITADA") {
    return null
  }

  const nombreSolicitante = solicitante?.nombre ?? "un solicitante"

  return (
    <Card className="rounded-lg border-amber-200 bg-amber-50 shadow-sm">
      <CardContent className="flex flex-col gap-2.5 p-3.5">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold text-amber-900">
            Revisión de solicitud
          </h2>
          <p className="text-sm text-amber-800">
            Enviada por{" "}
            <span className="font-semibold">{nombreSolicitante}</span>. Acéptala
            para iniciar el flujo o recházala.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 bg-emerald-600 px-3 text-white hover:bg-emerald-700"
            onClick={onAceptar}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Spinner className="size-3.5" />
            ) : (
              <Check data-icon="inline-start" className="size-3.5" />
            )}
            Aceptar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onRechazar}
            disabled={isSubmitting}
            className="h-8 text-red-700 hover:text-red-800"
          >
            <X data-icon="inline-start" className="size-3.5" />
            Rechazar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
