import { useEffect, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { Incidencia } from "@/types/incidencias"

type RechazarIncidenciaDialogProps = {
  incidencia: Incidencia | null
  isSubmitting: boolean
  error: string | null
  onConfirm: (motivoRechazo: string) => void
  onCancel: () => void
}

export function RechazarIncidenciaDialog({
  incidencia,
  isSubmitting,
  error,
  onConfirm,
  onCancel,
}: RechazarIncidenciaDialogProps) {
  const [motivo, setMotivo] = useState("")

  useEffect(() => {
    setMotivo("")
  }, [incidencia?.id])

  const puedeConfirmar = motivo.trim().length > 0 && !isSubmitting

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!puedeConfirmar) return
    onConfirm(motivo.trim())
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3"
      id="rechazar-incidencia-form"
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo rechazar la incidencia</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="rechazar-motivo"
          className="text-sm font-medium text-slate-700"
        >
          Motivo de rechazo
          <span className="ml-1 text-xs font-normal text-red-600">*</span>
        </label>
        <textarea
          id="rechazar-motivo"
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          placeholder="Explica brevemente por qué se rechaza esta solicitud. Este mensaje será visible para el solicitante."
          rows={4}
          required
          maxLength={500}
          className="w-full resize-y rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm leading-snug outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <p className="text-[11px] text-slate-500">
          {motivo.trim().length}/500 caracteres
        </p>
      </div>

      <div className="flex flex-col-reverse items-stretch justify-end gap-2 pt-1 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          size="sm"
          className="h-8 px-3"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="destructive"
          disabled={!puedeConfirmar}
          size="sm"
          className="h-8 px-3"
        >
          {isSubmitting ? (
            <>
              <Spinner className="size-3.5" />
              Rechazando...
            </>
          ) : (
            "Confirmar rechazo"
          )}
        </Button>
      </div>
    </form>
  )
}
