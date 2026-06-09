import { AlertTriangle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { Categoria } from "@/types/categorias"

type CategoriaDeleteDialogProps = {
  categoria: Categoria | null
  isDeleting: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function CategoriaDeleteDialog({
  categoria,
  isDeleting,
  error,
  onConfirm,
  onCancel,
}: CategoriaDeleteDialogProps) {
  if (!categoria) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">
          No hay una categoría seleccionada para eliminar.
        </p>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cerrar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-red-600"
        />
        <p>
          Esta acción no se puede deshacer. Si la categoría tiene incidencias
          asociadas, el sistema podría rechazar la eliminación.
        </p>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Categoría a eliminar
        </p>
        <p className="mt-0.5 text-sm font-semibold text-slate-950">
          {categoria.nombre}
        </p>
        {categoria.descripcion ? (
          <p className="mt-0.5 text-xs text-slate-600">{categoria.descripcion}</p>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo eliminar la categoría</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isDeleting}
          size="sm"
          className="h-8 px-3"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={onConfirm}
          disabled={isDeleting}
          size="sm"
          className="h-8 px-3"
        >
          {isDeleting ? (
            <>
              <Spinner className="size-3.5" />
              Eliminando...
            </>
          ) : (
            "Eliminar categoría"
          )}
        </Button>
      </div>
    </div>
  )
}
