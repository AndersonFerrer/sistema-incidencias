import {
  ArrowUpDown,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApiError } from "@/lib/http"

import { CatalogDeleteDialog } from "./catalog-delete-dialog"

/**
 * Definition of a single column in the catalog table.
 */
export type CatalogColumn<T> = {
  key: string
  label: string
  render: (item: T) => React.ReactNode
  width?: string
}

/**
 * Definition of a single editable field in the catalog form. The form
 * renderer is intentionally minimal — text, number, checkbox, select —
 * which covers the four catalog shapes used by the configuracion page.
 */
export type CatalogField = {
  key: string
  label: string
  type: "text" | "textarea" | "number" | "checkbox" | "select"
  required?: boolean
  placeholder?: string
  options?: ReadonlyArray<{ value: string; label: string }>
}

export type CatalogService<TItem, TInput> = {
  listar: () => Promise<TItem[]>
  crear: (input: TInput) => Promise<TItem>
  actualizar: (id: string, input: TInput) => Promise<TItem>
  eliminar: (id: string) => Promise<void>
}

type CatalogTabProps<TItem, TInput> = {
  resourceName: string
  service: CatalogService<TItem, TInput>
  columns: ReadonlyArray<CatalogColumn<TItem>>
  fields: ReadonlyArray<CatalogField>
  getId: (item: TItem) => string
  getLabel: (item: TItem) => string
  getHint?: (item: TItem) => string | null
  initialValues: () => Record<string, unknown>
  toInput: (values: Record<string, unknown>) => TInput
  fromItem: (item: TItem) => Record<string, unknown>
  emptyMessage?: string
}

type Modal = "cerrado" | "nuevo" | "editar"

/**
 * Generic catalog management tab. Renders a list with create/edit/delete
 * actions plus loading/error/empty states. Soft-delete goes through the
 * CatalogDeleteDialog (ELIMINAR text confirmation). The parent supplies
 * a service object plus column and field descriptors so the same shell
 * can back Categorias, Aplicativos, Estados Proceso and Estados Aprobacion.
 */
export function CatalogTab<TItem, TInput>({
  resourceName,
  service,
  columns,
  fields,
  getId,
  getLabel,
  getHint,
  initialValues,
  toInput,
  fromItem,
  emptyMessage,
}: CatalogTabProps<TItem, TInput>) {
  const [items, setItems] = useState<TItem[]>([])
  const [modal, setModal] = useState<Modal>("cerrado")
  const [target, setTarget] = useState<TItem | null>(null)
  const [values, setValues] = useState<Record<string, unknown>>(
    () => initialValues()
  )

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const cargarDatos = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const list = await service.listar()
      setItems(list)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `No se pudieron cargar ${resourceName.toLowerCase()}s.`
      )
    } finally {
      setIsLoading(false)
    }
  }, [service, resourceName])

  useEffect(() => {
    void cargarDatos()
  }, [cargarDatos])

  const abrirNuevo = () => {
    setTarget(null)
    setValues(initialValues())
    setFormError(null)
    setModal("nuevo")
  }

  const abrirEdicion = (item: TItem) => {
    setTarget(item)
    setValues(fromItem(item))
    setFormError(null)
    setModal("editar")
  }

  const cerrarModal = () => {
    if (isSubmitting) return
    setModal("cerrado")
    setTarget(null)
    setValues(initialValues())
    setFormError(null)
  }

  const abrirEliminar = (item: TItem) => {
    setTarget(item)
    setDeleteOpen(true)
  }

  const guardar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFormError(null)
    try {
      const input = toInput(values)
      if (modal === "editar" && target) {
        await service.actualizar(getId(target), input)
      } else {
        await service.crear(input)
      }
      await cargarDatos()
      cerrarModal()
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : `No se pudo guardar ${resourceName.toLowerCase()}.`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmarEliminar = async () => {
    if (!target) return
    await service.eliminar(getId(target))
    await cargarDatos()
  }

  const modalAbierto = modal !== "cerrado"
  const hint = target && getHint ? getHint(target) : null
  const empty = emptyMessage ?? `Aun no hay ${resourceName.toLowerCase()}s registrados.`

  const sortedFields = useMemo(() => fields, [fields])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-xs text-slate-500">
          {items.length === 0
            ? `0 ${resourceName.toLowerCase()}s`
            : `${items.length} ${resourceName.toLowerCase()}${items.length === 1 ? "" : "s"}`}
        </p>
        <Button
          size="default"
          className="h-8 px-3"
          onClick={abrirNuevo}
          type="button"
        >
          <Plus data-icon="inline-start" className="size-3.5" />
          Nuevo {resourceName.toLowerCase()}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Spinner className="size-3.5" />
          Cargando {resourceName.toLowerCase()}s...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-500">
          {empty}
        </div>
      ) : (
        <Card className="rounded-lg bg-white shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map((col, idx) => (
                    <TableHead
                      key={col.key}
                      className="h-9 px-4 text-xs font-medium uppercase tracking-wide text-slate-500"
                      style={col.width ? { width: col.width } : undefined}
                    >
                      {idx === 0 ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-900"
                        >
                          {col.label}
                          <ArrowUpDown aria-hidden="true" className="size-3" />
                        </button>
                      ) : (
                        col.label
                      )}
                    </TableHead>
                  ))}
                  <TableHead className="h-9 w-24 px-4 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={getId(item)}>
                    {columns.map((col) => (
                      <TableCell key={col.key} className="px-4 py-2 text-sm">
                        {col.render(item)}
                      </TableCell>
                    ))}
                    <TableCell className="px-4 py-2">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => abrirEdicion(item)}
                          aria-label={`Editar ${getLabel(item)}`}
                          className="text-slate-500 hover:text-slate-900"
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => abrirEliminar(item)}
                          aria-label={`Eliminar ${getLabel(item)}`}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={modalAbierto}
        onOpenChange={(open) => {
          if (!open) cerrarModal()
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {modal === "editar"
                ? `Editar ${resourceName.toLowerCase()}`
                : `Nuevo ${resourceName.toLowerCase()}`}
            </DialogTitle>
            <DialogDescription>
              {modal === "editar"
                ? `Modifica los datos del ${resourceName.toLowerCase()} seleccionado.`
                : `Registra un nuevo ${resourceName.toLowerCase()} en el sistema.`}
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex flex-col gap-4"
            onSubmit={guardar}
            noValidate
          >
            {sortedFields.map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <label
                  htmlFor={`catalog-field-${field.key}`}
                  className="text-xs font-medium text-slate-700"
                >
                  {field.label}
                  {field.required ? (
                    <span aria-hidden="true" className="ml-0.5 text-red-600">
                      *
                    </span>
                  ) : null}
                </label>

                {field.type === "checkbox" ? (
                  <label
                    htmlFor={`catalog-field-${field.key}`}
                    className="inline-flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      id={`catalog-field-${field.key}`}
                      type="checkbox"
                      checked={Boolean(values[field.key])}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          [field.key]: event.target.checked,
                        }))
                      }
                      disabled={isSubmitting}
                      className="size-4 rounded border-slate-300 text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                    Activo
                  </label>
                ) : field.type === "select" ? (
                  <select
                    id={`catalog-field-${field.key}`}
                    value={(values[field.key] as string | undefined) ?? ""}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.key]: event.target.value,
                      }))
                    }
                    disabled={isSubmitting}
                    className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-slate-900 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">Seleccionar</option>
                    {(field.options ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    id={`catalog-field-${field.key}`}
                    value={(values[field.key] as string | undefined) ?? ""}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.key]: event.target.value,
                      }))
                    }
                    disabled={isSubmitting}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm text-slate-900 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                ) : (
                  <Input
                    id={`catalog-field-${field.key}`}
                    type={field.type === "number" ? "number" : "text"}
                    value={(values[field.key] as string | number | undefined) ?? ""}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.key]:
                          field.type === "number"
                            ? event.target.value === ""
                              ? ""
                              : Number(event.target.value)
                            : event.target.value,
                      }))
                    }
                    disabled={isSubmitting}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
              </div>
            ))}

            {formError ? (
              <Alert variant="destructive">
                <AlertTitle>No se pudo guardar</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={cerrarModal}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 px-3"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Spinner data-icon="inline-start" />
                ) : null}
                Guardar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CatalogDeleteDialog
        open={deleteOpen}
        resourceName={resourceName}
        target={target ? getLabel(target) : null}
        hint={hint}
        onClose={() => {
          if (!isSubmitting) {
            setDeleteOpen(false)
            setTarget(null)
          }
        }}
        onConfirm={confirmarEliminar}
      />
    </div>
  )
}