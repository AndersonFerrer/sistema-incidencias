import { useEffect, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { AplicativoCliente } from "@/types/aplicativos"

type ClienteFormValues = {
  nombre: string
  activo: boolean
}

type ClienteFormProps = {
  cliente?: AplicativoCliente | null
  isSubmitting: boolean
  error: string | null
  onSubmit: (values: ClienteFormValues) => void
  onCancel: () => void
}

export function ClienteForm({
  cliente,
  isSubmitting,
  error,
  onSubmit,
  onCancel,
}: ClienteFormProps) {
  const isEditing = Boolean(cliente)
  const [nombre, setNombre] = useState(cliente?.nombre ?? "")
  const [activo, setActivo] = useState(cliente?.activo ?? true)

  useEffect(() => {
    setNombre(cliente?.nombre ?? "")
    setActivo(cliente?.activo ?? true)
  }, [cliente])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (nombre.trim().length === 0 || isSubmitting) return
    onSubmit({ nombre: nombre.trim(), activo })
  }

  const puedeEnviar = nombre.trim().length > 0 && !isSubmitting

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3"
      id="cliente-form"
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo guardar el cliente</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="cliente-nombre"
          className="text-sm font-medium text-slate-700"
        >
          Nombre del aplicativo
        </label>
        <input
          id="cliente-nombre"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          placeholder="Ej. App Móvil Clientes"
          maxLength={100}
          required
          className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="cliente-activo"
          type="checkbox"
          checked={activo}
          onChange={(event) => setActivo(event.target.checked)}
          className="size-4 rounded border-input text-blue-600 focus:ring-ring"
        />
        <label
          htmlFor="cliente-activo"
          className="text-sm font-medium text-slate-700"
        >
          Cliente activo
        </label>
      </div>

      {isEditing && cliente?.apiKey ? (
        <div className="flex flex-col gap-1 rounded-md border border-slate-200 bg-slate-50/60 p-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            API Key actual
          </span>
          <code className="truncate font-mono text-xs text-slate-700">
            {cliente.apiKey}
          </code>
          <p className="text-[11px] text-slate-500">
            La API key se regenera únicamente desde el botón de rotar en la
            tarjeta del cliente.
          </p>
        </div>
      ) : null}

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
          disabled={!puedeEnviar}
          size="sm"
          className="h-8 px-3"
        >
          {isSubmitting ? (
            <>
              <Spinner className="size-3.5" />
              Guardando...
            </>
          ) : isEditing ? (
            "Guardar cambios"
          ) : (
            "Crear cliente"
          )}
        </Button>
      </div>
    </form>
  )
}
