import { AlertTriangle, Trash2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { ApiError } from "@/lib/http"

interface ConfirmarEliminarIncidenciaDialogProps {
  open: boolean
  incidencia: { codigo: string; titulo: string } | null
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function ConfirmarEliminarIncidenciaDialog({
  open,
  incidencia,
  onClose,
  onConfirm,
}: ConfirmarEliminarIncidenciaDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleCancel() {
    if (submitting) return
    setError(null)
    onClose()
  }

  async function handleConfirm() {
    if (!incidencia || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo eliminar la incidencia."
      setError(message)
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleCancel()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle
              aria-hidden="true"
              className="size-4 text-destructive"
            />
            ¿Eliminar la incidencia {incidencia?.codigo ?? ""}?
          </DialogTitle>
          <DialogDescription>
            {incidencia?.titulo
              ? `“${incidencia.titulo}” será eliminada del sistema.`
              : "Esta incidencia será eliminada del sistema."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {error ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}

          <div
            role="alert"
            className="flex flex-col gap-1 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            <span className="font-medium">Esta acción no se puede deshacer.</span>
            <span className="text-destructive/90">
              Se eliminarán los comentarios, adjuntos, historial y aprobaciones
              asociadas a esta incidencia.
            </span>
          </div>
        </div>

        <DialogFooter className="pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3"
            onClick={handleCancel}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-8 px-3"
            onClick={handleConfirm}
            disabled={submitting || !incidencia}
          >
            {submitting ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Trash2 data-icon="inline-start" className="size-3.5" />
            )}
            {submitting ? "Eliminando..." : "Eliminar incidencia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}