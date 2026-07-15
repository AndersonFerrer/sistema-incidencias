import { useEffect, useState } from "react"
import { CircleAlert, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import type { Usuario } from "@/types/usuarios"

const HTTPS_URL_PATTERN =
  /^$|^https:\/\/[A-Za-z0-9.-]+(:[0-9]{1,5})?(\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]*)?$/
const MAX_NOMBRE_LENGTH = 150
const MAX_AVATAR_LENGTH = 500

type FieldErrors = {
  nombre: string | null
  avatarUrl: string | null
  general: string | null
}

const EMPTY_ERRORS: FieldErrors = {
  nombre: null,
  avatarUrl: null,
  general: null,
}

interface PerfilInfoFormProps {
  usuario: Usuario
  onSubmit: (input: { nombre: string; avatarUrl: string | null }) => Promise<void>
}

export function PerfilInfoForm({ usuario, onSubmit }: PerfilInfoFormProps) {
  const [nombre, setNombre] = useState(usuario.nombre)
  const [avatarUrl, setAvatarUrl] = useState(usuario.avatarUrl ?? "")
  const [errors, setErrors] = useState<FieldErrors>(EMPTY_ERRORS)
  const [submitting, setSubmitting] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  useEffect(() => {
    setNombre(usuario.nombre)
    setAvatarUrl(usuario.avatarUrl ?? "")
    setErrors(EMPTY_ERRORS)
    setLastSavedAt(null)
  }, [usuario])

  function validate(): FieldErrors {
    const trimmed = nombre.trim()
    const next: FieldErrors = { ...EMPTY_ERRORS }
    if (trimmed.length === 0) {
      next.nombre = "El nombre es obligatorio."
    } else if (trimmed.length > MAX_NOMBRE_LENGTH) {
      next.nombre = `El nombre no puede superar ${MAX_NOMBRE_LENGTH} caracteres.`
    }
    if (avatarUrl.length > MAX_AVATAR_LENGTH) {
      next.avatarUrl = `El enlace del avatar no puede superar ${MAX_AVATAR_LENGTH} caracteres.`
    } else if (!HTTPS_URL_PATTERN.test(avatarUrl.trim())) {
      next.avatarUrl = "Usa una URL HTTPS valida o deja el campo vacio."
    }
    return next
  }

  const dirty =
    nombre.trim() !== usuario.nombre ||
    (avatarUrl.trim() === "") !== (usuario.avatarUrl == null || usuario.avatarUrl === "")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const validation = validate()
    if (Object.values(validation).some((value) => value !== null)) {
      setErrors(validation)
      return
    }
    setErrors(EMPTY_ERRORS)
    setSubmitting(true)
    const payload = {
      nombre: nombre.trim(),
      avatarUrl: avatarUrl.trim() === "" ? null : avatarUrl.trim(),
    }
    try {
      await onSubmit(payload)
      setLastSavedAt(new Date().toISOString())
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo actualizar el perfil."
      setErrors({ ...EMPTY_ERRORS, general: message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {errors.general ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <span>{errors.general}</span>
        </div>
      ) : null}

      {lastSavedAt ? (
        <p
          aria-live="polite"
          className="text-xs font-medium text-emerald-700"
        >
          Cambios guardados correctamente.
        </p>
      ) : null}

      <FieldGroup className="gap-4">
        <Field data-invalid={Boolean(errors.nombre)}>
          <FieldLabel htmlFor="perfil-nombre">Nombre</FieldLabel>
          <Input
            id="perfil-nombre"
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

        <Field>
          <FieldLabel htmlFor="perfil-email">Correo electronico</FieldLabel>
          <Input
            id="perfil-email"
            type="email"
            value={usuario.email}
            readOnly
            disabled
            aria-readonly
          />
          <FieldDescription>
            Lo administra el equipo de administracion. No se puede cambiar
            desde el perfil.
          </FieldDescription>
        </Field>

        <Field data-invalid={Boolean(errors.avatarUrl)}>
          <FieldLabel htmlFor="perfil-avatar">Avatar (URL)</FieldLabel>
          <Input
            id="perfil-avatar"
            type="url"
            inputMode="url"
            placeholder="https://example.com/avatar.png"
            maxLength={MAX_AVATAR_LENGTH}
            value={avatarUrl}
            aria-invalid={Boolean(errors.avatarUrl)}
            disabled={submitting}
            onChange={(event) => {
              setAvatarUrl(event.target.value)
              if (errors.avatarUrl) setErrors({ ...errors, avatarUrl: null })
            }}
          />
          <FieldDescription>
            Deja vacio para quitar tu avatar actual. Solo HTTPS.
          </FieldDescription>
          <FieldError>
            {errors.avatarUrl ? errors.avatarUrl : null}
          </FieldError>
        </Field>
      </FieldGroup>

      <div className="flex items-center gap-2 pt-1">
        <Button
          type="submit"
          size="sm"
          className="h-8 px-3"
          disabled={submitting || !dirty}
        >
          {submitting ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Save aria-hidden="true" className="mr-1.5 size-3.5" />
          )}
          Guardar cambios
        </Button>
      </div>
    </form>
  )
}
