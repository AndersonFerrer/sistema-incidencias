import { useEffect, useState } from "react"
import { CircleAlert, ShieldCheck } from "lucide-react"

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

const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 100

type FieldErrors = {
  actual: string | null
  nueva: string | null
  confirmar: string | null
  general: string | null
}

const EMPTY_ERRORS: FieldErrors = {
  actual: null,
  nueva: null,
  confirmar: null,
  general: null,
}

interface CambiarPasswordFormProps {
  onSubmit: (input: {
    currentPassword: string
    newPassword: string
  }) => Promise<void>
}

export function CambiarPasswordForm({ onSubmit }: CambiarPasswordFormProps) {
  const [actual, setActual] = useState("")
  const [nueva, setNueva] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [errors, setErrors] = useState<FieldErrors>(EMPTY_ERRORS)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setActual("")
    setNueva("")
    setConfirmar("")
    setErrors(EMPTY_ERRORS)
    setSuccess(false)
  }, [])

  function validate(): FieldErrors {
    const next: FieldErrors = { ...EMPTY_ERRORS }
    if (actual.length === 0) {
      next.actual = "Ingresa tu contrasena actual."
    }
    if (nueva.length === 0) {
      next.nueva = "Ingresa la nueva contrasena."
    } else if (nueva.length < MIN_PASSWORD_LENGTH) {
      next.nueva = `La nueva contrasena debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    } else if (nueva.length > MAX_PASSWORD_LENGTH) {
      next.nueva = `La nueva contrasena no puede superar ${MAX_PASSWORD_LENGTH} caracteres.`
    } else if (actual.length > 0 && nueva === actual) {
      next.nueva = "La nueva contrasena debe ser distinta a la actual."
    }
    if (confirmar.length === 0) {
      next.confirmar = "Confirma la nueva contrasena."
    } else if (nueva.length > 0 && nueva !== confirmar) {
      next.confirmar = "Las contrasenas no coinciden."
    }
    return next
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const validation = validate()
    if (Object.values(validation).some((v) => v !== null)) {
      setErrors(validation)
      return
    }
    setErrors(EMPTY_ERRORS)
    setSubmitting(true)
    try {
      await onSubmit({ currentPassword: actual, newPassword: nueva })
      setActual("")
      setNueva("")
      setConfirmar("")
      setSuccess(true)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo cambiar la contrasena."
      const lower = message.toLowerCase()
      if (lower.includes("actual") || lower.includes("no coincide")) {
        setErrors({ ...EMPTY_ERRORS, actual: message })
      } else if (
        lower.includes("contrase") ||
        lower.includes("password") ||
        lower.includes("caracteres")
      ) {
        setErrors({ ...EMPTY_ERRORS, nueva: message })
      } else {
        setErrors({ ...EMPTY_ERRORS, general: message })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {success ? (
        <div
          aria-live="polite"
          className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700"
        >
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <span>Contrasena actualizada. Ya puedes iniciar sesion con ella.</span>
        </div>
      ) : null}

      {errors.general ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <span>{errors.general}</span>
        </div>
      ) : null}

      <FieldGroup className="gap-4">
        <Field data-invalid={Boolean(errors.actual)}>
          <FieldLabel htmlFor="perfil-password-actual">
            Contrasena actual
          </FieldLabel>
          <Input
            id="perfil-password-actual"
            type="password"
            autoComplete="current-password"
            value={actual}
            aria-invalid={Boolean(errors.actual)}
            disabled={submitting}
            onChange={(event) => {
              setActual(event.target.value)
              if (errors.actual) setErrors({ ...errors, actual: null })
            }}
          />
          <FieldError>{errors.actual ? errors.actual : null}</FieldError>
        </Field>

        <Field data-invalid={Boolean(errors.nueva)}>
          <FieldLabel htmlFor="perfil-password-nueva">
            Nueva contrasena
          </FieldLabel>
          <Input
            id="perfil-password-nueva"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            maxLength={MAX_PASSWORD_LENGTH}
            value={nueva}
            aria-invalid={Boolean(errors.nueva)}
            disabled={submitting}
            onChange={(event) => {
              setNueva(event.target.value)
              if (errors.nueva) setErrors({ ...errors, nueva: null })
            }}
          />
          <FieldDescription>
            Al menos {MIN_PASSWORD_LENGTH} caracteres y distinta a la actual.
          </FieldDescription>
          <FieldError>{errors.nueva ? errors.nueva : null}</FieldError>
        </Field>

        <Field data-invalid={Boolean(errors.confirmar)}>
          <FieldLabel htmlFor="perfil-password-confirmar">
            Confirmar nueva contrasena
          </FieldLabel>
          <Input
            id="perfil-password-confirmar"
            type="password"
            autoComplete="new-password"
            value={confirmar}
            aria-invalid={Boolean(errors.confirmar)}
            disabled={submitting}
            onChange={(event) => {
              setConfirmar(event.target.value)
              if (errors.confirmar) setErrors({ ...errors, confirmar: null })
            }}
          />
          <FieldError>
            {errors.confirmar ? errors.confirmar : null}
          </FieldError>
        </Field>
      </FieldGroup>

      <div className="flex items-center gap-2 pt-1">
        <Button
          type="submit"
          size="sm"
          className="h-8 px-3"
          disabled={submitting}
        >
          {submitting ? (
            <Spinner data-icon="inline-start" />
          ) : null}
          Cambiar contrasena
        </Button>
      </div>
    </form>
  )
}
