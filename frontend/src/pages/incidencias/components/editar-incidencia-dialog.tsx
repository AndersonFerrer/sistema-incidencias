import { Paperclip, Pencil, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ApiError } from "@/lib/http"
import type { AplicativoCliente } from "@/types/aplicativos"
import type { Categoria } from "@/types/categorias"
import type {
  ActualizarIncidenciaInput,
  Incidencia,
  Prioridad,
} from "@/types/incidencias"
import type { Usuario } from "@/types/usuarios"

const MIN_TITULO_LENGTH = 5
const MAX_TITULO_LENGTH = 200
const MAX_DESCRIPCION_LENGTH = 4000

const PRIORIDADES: { value: Prioridad; label: string }[] = [
  { value: "BAJA", label: "Baja" },
  { value: "MEDIA", label: "Media" },
  { value: "ALTA", label: "Alta" },
  { value: "CRITICA", label: "Crítica" },
]

const AGENT_ROLE_CODES = ["AGENTE", "ADMINISTRADOR"]

type FieldErrors = {
  titulo: string | null
  descripcion: string | null
  categoriaId: string | null
  prioridad: string | null
  asignadoA: string | null
  archivos: string | null
  general: string | null
}

const EMPTY_ERRORS: FieldErrors = {
  titulo: null,
  descripcion: null,
  categoriaId: null,
  prioridad: null,
  asignadoA: null,
  archivos: null,
  general: null,
}

interface EditarIncidenciaDialogProps {
  open: boolean
  mode: "crear" | "editar"
  initial?: Incidencia | null
  aplicativos: AplicativoCliente[]
  categorias: Categoria[]
  usuarios: Usuario[]
  onClose: () => void
  onSubmit: (
    input: ActualizarIncidenciaInput | {
      mode: "crear"
      clienteId: string
      titulo: string
      descripcion: string
      categoriaId: string
      prioridad: Prioridad
      asignadoA: string | null
      archivos: File[]
    }
  ) => Promise<void>
}

function routeErrorMessage(
  message: string
): keyof Pick<
  FieldErrors,
  "titulo" | "descripcion" | "categoriaId" | "prioridad" | "asignadoA" | "archivos"
> | null {
  const lower = message.toLowerCase()
  if (lower.includes("título") || lower.includes("titulo")) return "titulo"
  if (lower.includes("descripci")) return "descripcion"
  if (lower.includes("categor")) return "categoriaId"
  if (lower.includes("prioridad")) return "prioridad"
  if (lower.includes("asignad")) return "asignadoA"
  if (lower.includes("archivo") || lower.includes("adjunt"))
    return "archivos"
  return null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function EditarIncidenciaDialog({
  open,
  mode,
  initial,
  aplicativos,
  categorias,
  usuarios,
  onClose,
  onSubmit,
}: EditarIncidenciaDialogProps) {
  const isEdit = mode === "editar"
  const source = initial ?? null

  const [titulo, setTitulo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [clienteId, setClienteId] = useState("")
  const [categoriaId, setCategoriaId] = useState("")
  const [prioridad, setPrioridad] = useState<Prioridad>("MEDIA")
  const [asignadoA, setAsignadoA] = useState("")
  const [archivos, setArchivos] = useState<File[]>([])
  const [errors, setErrors] = useState<FieldErrors>(EMPTY_ERRORS)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitulo(source?.titulo ?? "")
    setDescripcion(source?.descripcion ?? "")
    setClienteId(source?.clienteId ?? "")
    setCategoriaId(source?.categoriaId ?? "")
    setPrioridad(source?.prioridad ?? "MEDIA")
    setAsignadoA(source?.asignadoA ?? "")
    setArchivos([])
    setErrors(EMPTY_ERRORS)
    setSubmitting(false)
  }, [open, source])

  const aplicativosActivos = useMemo(
    () => aplicativos.filter((app) => app.activo),
    [aplicativos]
  )

  const categoriasDelCliente = useMemo(() => {
    if (!clienteId) return []
    return categorias.filter(
      (categoria) =>
        categoria.activo &&
        (categoria.aplicativoId
          ? categoria.aplicativoId === clienteId
          : true)
    )
  }, [categorias, clienteId])

  useEffect(() => {
    if (
      categoriaId &&
      !categoriasDelCliente.some((cat) => cat.id === categoriaId)
    ) {
      setCategoriaId("")
    }
  }, [categoriasDelCliente, categoriaId])

  const usuariosAsignables = useMemo(
    () =>
      usuarios
        .filter((usuario) => usuario.activo)
        .filter((usuario) =>
          AGENT_ROLE_CODES.includes(usuario.rol?.codigo ?? "")
        ),
    [usuarios]
  )

  const clienteActual = useMemo(
    () => aplicativos.find((app) => app.id === clienteId) ?? null,
    [aplicativos, clienteId]
  )

  function validate(): FieldErrors {
    const next: FieldErrors = { ...EMPTY_ERRORS }
    const trimmedTitulo = titulo.trim()
    const trimmedDescripcion = descripcion.trim()
    if (trimmedTitulo.length === 0) {
      next.titulo = "El título es obligatorio."
    } else if (trimmedTitulo.length < MIN_TITULO_LENGTH) {
      next.titulo = `El título debe tener al menos ${MIN_TITULO_LENGTH} caracteres.`
    } else if (trimmedTitulo.length > MAX_TITULO_LENGTH) {
      next.titulo = `El título no puede superar los ${MAX_TITULO_LENGTH} caracteres.`
    }
    if (trimmedDescripcion.length === 0) {
      next.descripcion = "La descripción es obligatoria."
    } else if (trimmedDescripcion.length > MAX_DESCRIPCION_LENGTH) {
      next.descripcion = `La descripción no puede superar los ${MAX_DESCRIPCION_LENGTH} caracteres.`
    }
    if (!isEdit && clienteId.length === 0) {
      next.categoriaId = "Selecciona un cliente y una categoría."
    } else if (categoriaId.length === 0) {
      next.categoriaId = "Selecciona una categoría."
    }
    if (archivos.some((file) => file.size === 0)) {
      next.archivos = "Hay archivos vacíos en la selección."
    }
    return next
  }

  function handleArchivos(event: React.ChangeEvent<HTMLInputElement>) {
    const list = event.target.files
    if (!list || list.length === 0) return
    setArchivos((prev) => [...prev, ...Array.from(list)])
    event.target.value = ""
    if (errors.archivos) {
      setErrors({ ...errors, archivos: null })
    }
  }

  function removerArchivo(index: number) {
    setArchivos((prev) => prev.filter((_, idx) => idx !== index))
    if (errors.archivos) {
      setErrors({ ...errors, archivos: null })
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const validation = validate()
    const hasValidationErrors = Object.values(validation).some(
      (value) => value !== null
    )
    if (hasValidationErrors) {
      setErrors(validation)
      return
    }

    setErrors(EMPTY_ERRORS)
    setSubmitting(true)

    const trimmedTitulo = titulo.trim()
    const trimmedDescripcion = descripcion.trim()
    const asignado = asignadoA.length > 0 ? asignadoA : null

    try {
      if (isEdit) {
        const input: ActualizarIncidenciaInput = {
          titulo: trimmedTitulo,
          descripcion: trimmedDescripcion,
          categoriaId,
          prioridad,
          asignadoA: asignado,
          archivos: archivos.length > 0 ? archivos : undefined,
        }
        await onSubmit(input)
      } else {
        const input = {
          mode: "crear" as const,
          clienteId,
          titulo: trimmedTitulo,
          descripcion: trimmedDescripcion,
          categoriaId,
          prioridad,
          asignadoA: asignado,
          archivos,
        }
        await onSubmit(input)
      }
      onClose()
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo guardar la incidencia."
      const field = routeErrorMessage(message)
      if (field) {
        setErrors({ ...EMPTY_ERRORS, [field]: message, general: null })
      } else {
        setErrors({ ...EMPTY_ERRORS, general: message })
      }
      setSubmitting(false)
    }
  }

  function handleCancel() {
    if (submitting) return
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleCancel()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar incidencia" : "Nueva incidencia"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos principales de la incidencia. Los cambios se registrarán en el historial."
              : "Registra una nueva incidencia en el sistema."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
          onSubmit={handleSubmit}
          noValidate
        >
          {errors.general ? (
            <FieldError>{errors.general}</FieldError>
          ) : null}

          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(errors.titulo)}>
              <FieldLabel htmlFor="editar-titulo">Título</FieldLabel>
              <Input
                id="editar-titulo"
                value={titulo}
                maxLength={MAX_TITULO_LENGTH}
                aria-invalid={Boolean(errors.titulo)}
                disabled={submitting}
                onChange={(event) => {
                  setTitulo(event.target.value)
                  if (errors.titulo) setErrors({ ...errors, titulo: null })
                }}
                placeholder="Ej. No carga el sistema de ventas"
              />
              <FieldDescription>
                Mínimo {MIN_TITULO_LENGTH} caracteres, máximo {MAX_TITULO_LENGTH}.
              </FieldDescription>
              <FieldError>
                {errors.titulo ? errors.titulo : null}
              </FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.descripcion)}>
              <FieldLabel htmlFor="editar-descripcion">
                Descripción
              </FieldLabel>
              <textarea
                id="editar-descripcion"
                value={descripcion}
                rows={4}
                maxLength={MAX_DESCRIPCION_LENGTH}
                aria-invalid={Boolean(errors.descripcion)}
                disabled={submitting}
                onChange={(event) => {
                  setDescripcion(event.target.value)
                  if (errors.descripcion)
                    setErrors({ ...errors, descripcion: null })
                }}
                placeholder="Detalla el problema, pasos para reproducirlo y el impacto observado."
                className="w-full resize-y rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm leading-snug outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
              />
              <FieldError>
                {errors.descripcion ? errors.descripcion : null}
              </FieldError>
            </Field>

            {!isEdit ? (
              <Field data-invalid={Boolean(errors.categoriaId)}>
                <FieldLabel htmlFor="editar-cliente">
                  Cliente / aplicativo
                </FieldLabel>
                <select
                  id="editar-cliente"
                  value={clienteId}
                  aria-invalid={Boolean(errors.categoriaId)}
                  disabled={submitting || aplicativosActivos.length === 0}
                  onChange={(event) => {
                    setClienteId(event.target.value)
                    if (errors.categoriaId)
                      setErrors({ ...errors, categoriaId: null })
                  }}
                  className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-slate-900 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
                >
                  <option value="">
                    {aplicativosActivos.length === 0
                      ? "Cargando clientes..."
                      : "Selecciona un cliente"}
                  </option>
                  {aplicativosActivos.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.nombre}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field>
                <FieldLabel>Cliente / aplicativo</FieldLabel>
                <Input
                  value={clienteActual?.nombre ?? "—"}
                  readOnly
                  disabled
                  aria-readonly
                />
                <FieldDescription>
                  El cliente no puede modificarse en una incidencia existente.
                </FieldDescription>
              </Field>
            )}

            <Field data-invalid={Boolean(errors.categoriaId)}>
              <FieldLabel htmlFor="editar-categoria">Categoría</FieldLabel>
              <select
                id="editar-categoria"
                value={categoriaId}
                aria-invalid={Boolean(errors.categoriaId)}
                disabled={
                  submitting || (!isEdit && !clienteId)
                }
                onChange={(event) => {
                  setCategoriaId(event.target.value)
                  if (errors.categoriaId)
                    setErrors({ ...errors, categoriaId: null })
                }}
                className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-slate-900 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
              >
                <option value="">
                  {!isEdit && !clienteId
                    ? "Selecciona primero un cliente"
                    : categoriasDelCliente.length === 0
                      ? "Sin categorías disponibles"
                      : "Selecciona una categoría"}
                </option>
                {categoriasDelCliente.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
              <FieldError>
                {errors.categoriaId ? errors.categoriaId : null}
              </FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.prioridad)}>
              <FieldLabel htmlFor="editar-prioridad">Prioridad</FieldLabel>
              <select
                id="editar-prioridad"
                value={prioridad}
                aria-invalid={Boolean(errors.prioridad)}
                disabled={submitting}
                onChange={(event) =>
                  setPrioridad(event.target.value as Prioridad)
                }
                className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-slate-900 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
              >
                {PRIORIDADES.map((prioridadItem) => (
                  <option key={prioridadItem.value} value={prioridadItem.value}>
                    {prioridadItem.label}
                  </option>
                ))}
              </select>
              <FieldError>
                {errors.prioridad ? errors.prioridad : null}
              </FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.asignadoA)}>
              <FieldLabel htmlFor="editar-asignado">
                Asignado a
                <span className="ml-1 text-xs font-normal text-slate-400">
                  (opcional)
                </span>
              </FieldLabel>
              <select
                id="editar-asignado"
                value={asignadoA}
                aria-invalid={Boolean(errors.asignadoA)}
                disabled={submitting}
                onChange={(event) => setAsignadoA(event.target.value)}
                className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-slate-900 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
              >
                <option value="">Sin asignar</option>
                {usuariosAsignables.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.nombre} — {usuario.rol.nombre}
                  </option>
                ))}
              </select>
              <FieldDescription>
                Solo se muestran usuarios activos con rol AGENTE o
                ADMINISTRADOR.
              </FieldDescription>
              <FieldError>
                {errors.asignadoA ? errors.asignadoA : null}
              </FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.archivos)}>
              <FieldLabel htmlFor="editar-archivos">
                Adjuntar archivos
                <span className="ml-1 text-xs font-normal text-slate-400">
                  (opcional)
                </span>
              </FieldLabel>
              <label
                htmlFor="editar-archivos"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                <Paperclip aria-hidden="true" className="size-3.5" />
                Seleccionar archivos
                <input
                  id="editar-archivos"
                  type="file"
                  multiple
                  disabled={submitting}
                  className="sr-only"
                  onChange={handleArchivos}
                />
              </label>
              <FieldDescription>
                {isEdit
                  ? "Los archivos nuevos se sumarán a los adjuntos existentes."
                  : "Puedes adjuntar varias imágenes o documentos de respaldo."}
              </FieldDescription>
              <FieldError>
                {errors.archivos ? errors.archivos : null}
              </FieldError>
              {archivos.length > 0 ? (
                <ul className="mt-1 flex flex-col gap-1.5">
                  {archivos.map((archivo, index) => (
                    <li
                      key={`${archivo.name}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Paperclip
                          aria-hidden="true"
                          className="size-3.5 shrink-0 text-slate-400"
                        />
                        <span className="truncate text-slate-700">
                          {archivo.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatBytes(archivo.size)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerArchivo(index)}
                        disabled={submitting}
                        aria-label={`Quitar ${archivo.name}`}
                        className="flex size-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X aria-hidden="true" className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Field>
          </FieldGroup>

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
              type="submit"
              size="sm"
              className="h-8 px-3"
              disabled={submitting}
            >
              {submitting ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Pencil data-icon="inline-start" className="size-3.5" />
              )}
              {isEdit ? "Guardar cambios" : "Crear incidencia"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}