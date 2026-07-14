import { useEffect, useState } from "react"

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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ApiError } from "@/lib/http"
import type { Rol } from "@/types/roles"
import type {
  ActualizarUsuarioInput,
  CrearUsuarioInput,
  Usuario,
} from "@/types/usuarios"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const MAX_NOMBRE_LENGTH = 100

type FieldErrors = {
  nombre: string | null
  email: string | null
  password: string | null
  rolCodigo: string | null
  general: string | null
}

const EMPTY_ERRORS: FieldErrors = {
  nombre: null,
  email: null,
  password: null,
  rolCodigo: null,
  general: null,
}

interface UsuarioFormDialogProps {
  open: boolean
  mode: "create" | "edit"
  initial?: Usuario | null
  roles: Rol[]
  onClose: () => void
  onSubmit: (
    input: CrearUsuarioInput | ActualizarUsuarioInput
  ) => Promise<void>
}

function routeErrorMessage(message: string): keyof Pick<
  FieldErrors,
  "nombre" | "email" | "password" | "rolCodigo"
> | null {
  const lower = message.toLowerCase()
  if (lower.includes("email") || lower.includes("correo")) return "email"
  if (lower.includes("contraseña") || lower.includes("password"))
    return "password"
  if (lower.includes("nombre")) return "nombre"
  if (lower.includes("rol")) return "rolCodigo"
  return null
}

export function UsuarioFormDialog({
  open,
  mode,
  initial,
  roles,
  onClose,
  onSubmit,
}: UsuarioFormDialogProps) {
  const isEdit = mode === "edit"
  const sourceUser = initial ?? null

  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rolCodigo, setRolCodigo] = useState("")
  const [activo, setActivo] = useState(true)
  const [errors, setErrors] = useState<FieldErrors>(EMPTY_ERRORS)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setNombre(sourceUser?.nombre ?? "")
    setEmail(sourceUser?.email ?? "")
    setPassword("")
    setRolCodigo(sourceUser?.rol.codigo ?? "")
    setActivo(sourceUser?.activo ?? true)
    setErrors(EMPTY_ERRORS)
    setSubmitting(false)
  }, [open, sourceUser])

  function validate(): FieldErrors {
    const trimmedNombre = nombre.trim()
    const trimmedEmail = email.trim()
    const next: FieldErrors = { ...EMPTY_ERRORS }
    if (trimmedNombre.length === 0) {
      next.nombre = "El nombre es obligatorio."
    } else if (trimmedNombre.length > MAX_NOMBRE_LENGTH) {
      next.nombre = `El nombre no puede superar los ${MAX_NOMBRE_LENGTH} caracteres.`
    }
    if (trimmedEmail.length === 0) {
      next.email = "El correo es obligatorio."
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      next.email = "Ingrese un correo válido."
    }
    if (!isEdit) {
      if (password.length === 0) {
        next.password = "La contraseña es obligatoria."
      } else if (password.length < MIN_PASSWORD_LENGTH) {
        next.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
      }
    }
    if (rolCodigo.length === 0) {
      next.rolCodigo = "Selecciona un rol."
    }
    return next
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

    const trimmedNombre = nombre.trim()
    const trimmedEmail = email.trim()

    const input: CrearUsuarioInput | ActualizarUsuarioInput = isEdit
      ? {
          nombre: trimmedNombre,
          email: trimmedEmail,
          rolCodigo: rolCodigo as CrearUsuarioInput["rolCodigo"],
          activo,
        }
      : {
          nombre: trimmedNombre,
          email: trimmedEmail,
          password,
          rolCodigo: rolCodigo as CrearUsuarioInput["rolCodigo"],
          activo,
        }

    try {
      await onSubmit(input)
      onClose()
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo guardar el usuario."
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar usuario" : "Nuevo usuario"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos del usuario seleccionado."
              : "Registra un nuevo usuario en el sistema."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit}
          noValidate
        >
          {errors.general ? (
            <FieldError>{errors.general}</FieldError>
          ) : null}

          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(errors.nombre)}>
              <FieldLabel htmlFor="usuario-nombre">Nombre</FieldLabel>
              <Input
                id="usuario-nombre"
                autoComplete="name"
                maxLength={MAX_NOMBRE_LENGTH}
                value={nombre}
                aria-invalid={Boolean(errors.nombre)}
                disabled={submitting}
                onChange={(event) => {
                  setNombre(event.target.value)
                  if (errors.nombre) setErrors({ ...errors, nombre: null })
                }}
              />
              <FieldError>
                {errors.nombre ? errors.nombre : null}
              </FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="usuario-email">Correo electrónico</FieldLabel>
              <Input
                id="usuario-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                aria-invalid={Boolean(errors.email)}
                disabled={submitting}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (errors.email) setErrors({ ...errors, email: null })
                }}
              />
              <FieldError>
                {errors.email ? errors.email : null}
              </FieldError>
            </Field>

            {!isEdit ? (
              <Field data-invalid={Boolean(errors.password)}>
                <FieldLabel htmlFor="usuario-password">Contraseña</FieldLabel>
                <Input
                  id="usuario-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  aria-invalid={Boolean(errors.password)}
                  disabled={submitting}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (errors.password)
                      setErrors({ ...errors, password: null })
                  }}
                />
                <FieldError>
                  {errors.password ? errors.password : null}
                </FieldError>
              </Field>
            ) : null}

            <Field data-invalid={Boolean(errors.rolCodigo)}>
              <FieldLabel htmlFor="usuario-rol">Rol</FieldLabel>
              <select
                id="usuario-rol"
                value={rolCodigo}
                aria-invalid={Boolean(errors.rolCodigo)}
                disabled={submitting || roles.length === 0}
                onChange={(event) => {
                  setRolCodigo(event.target.value)
                  if (errors.rolCodigo)
                    setErrors({ ...errors, rolCodigo: null })
                }}
                className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-slate-900 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
              >
                <option value="">
                  {roles.length === 0
                    ? "Cargando roles..."
                    : "Selecciona un rol"}
                </option>
                {roles.map((rolItem) => (
                  <option key={rolItem.id} value={rolItem.codigo}>
                    {rolItem.nombre}
                  </option>
                ))}
              </select>
              <FieldError>
                {errors.rolCodigo ? errors.rolCodigo : null}
              </FieldError>
            </Field>

            <Field
              orientation="horizontal"
              data-invalid={Boolean(errors.rolCodigo)}
            >
              <input
                id="usuario-activo"
                type="checkbox"
                checked={activo}
                disabled={submitting}
                onChange={(event) => setActivo(event.target.checked)}
                className="size-4 rounded border-input text-blue-600 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
              />
              <FieldLabel
                htmlFor="usuario-activo"
                className="text-sm font-medium"
              >
                Usuario activo
              </FieldLabel>
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
              ) : null}
              {isEdit ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
