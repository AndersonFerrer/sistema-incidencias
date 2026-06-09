import { useEffect, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { AplicativoCliente } from "@/types/aplicativos"
import type { Categoria } from "@/types/categorias"

type CategoriaFormValues = {
  aplicativoId: string
  nombre: string
  descripcion: string
  activo: boolean
}

type CategoriaFormProps = {
  categoria?: Categoria | null
  aplicativos: AplicativoCliente[]
  isSubmitting: boolean
  error: string | null
  onSubmit: (values: CategoriaFormValues) => void
  onCancel: () => void
}

export function CategoriaForm({
  categoria,
  aplicativos,
  isSubmitting,
  error,
  onSubmit,
  onCancel,
}: CategoriaFormProps) {
  const isEditing = Boolean(categoria)
  const [aplicativoId, setAplicativoId] = useState(
    categoria?.aplicativoId ?? ""
  )
  const [nombre, setNombre] = useState(categoria?.nombre ?? "")
  const [descripcion, setDescripcion] = useState(categoria?.descripcion ?? "")
  const [activo, setActivo] = useState(categoria?.activo ?? true)

  useEffect(() => {
    setAplicativoId(categoria?.aplicativoId ?? "")
    setNombre(categoria?.nombre ?? "")
    setDescripcion(categoria?.descripcion ?? "")
    setActivo(categoria?.activo ?? true)
  }, [categoria])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (
      aplicativoId.length === 0 ||
      nombre.trim().length === 0 ||
      isSubmitting
    ) {
      return
    }
    onSubmit({
      aplicativoId,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      activo,
    })
  }

  const puedeEnviar =
    aplicativoId.length > 0 && nombre.trim().length > 0 && !isSubmitting

  const aplicativosActivos = aplicativos.filter(
    (aplicativo) => aplicativo.activo
  )

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
      id="categoria-form"
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo guardar la categoría</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <label
          htmlFor="categoria-aplicativo"
          className="text-sm font-medium text-slate-700"
        >
          Cliente / aplicativo
        </label>
        <select
          id="categoria-aplicativo"
          value={aplicativoId}
          onChange={(event) => setAplicativoId(event.target.value)}
          required
          disabled={aplicativosActivos.length === 0}
          className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm text-slate-900 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">Selecciona un cliente</option>
          {aplicativosActivos.map((aplicativo) => (
            <option key={aplicativo.id} value={aplicativo.id}>
              {aplicativo.nombre}
            </option>
          ))}
        </select>
        {aplicativosActivos.length === 0 ? (
          <p className="text-xs text-slate-500">
            Primero registra un cliente activo para poder crear categorías.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="categoria-nombre"
          className="text-sm font-medium text-slate-700"
        >
          Nombre de la categoría
        </label>
        <input
          id="categoria-nombre"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          placeholder="Ej. Error de sistema"
          maxLength={100}
          required
          className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="categoria-descripcion"
          className="text-sm font-medium text-slate-700"
        >
          Descripción
          <span className="ml-1 text-xs font-normal text-slate-400">
            (opcional)
          </span>
        </label>
        <textarea
          id="categoria-descripcion"
          value={descripcion}
          onChange={(event) => setDescripcion(event.target.value)}
          placeholder="Describe brevemente el tipo de incidencias que agrupa esta categoría."
          rows={3}
          maxLength={500}
          className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          id="categoria-activo"
          type="checkbox"
          checked={activo}
          onChange={(event) => setActivo(event.target.checked)}
          className="size-4 rounded border-input text-blue-600 focus:ring-ring"
        />
        <label
          htmlFor="categoria-activo"
          className="text-sm font-medium text-slate-700"
        >
          Categoría activa
        </label>
      </div>

      <div className="flex flex-col-reverse items-stretch justify-end gap-2 pt-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={!puedeEnviar}>
          {isSubmitting ? (
            <>
              <Spinner className="size-4" />
              Guardando...
            </>
          ) : isEditing ? (
            "Guardar cambios"
          ) : (
            "Crear categoría"
          )}
        </Button>
      </div>
    </form>
  )
}
