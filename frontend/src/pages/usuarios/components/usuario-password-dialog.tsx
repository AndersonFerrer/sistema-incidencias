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
import type { Usuario } from "@/types/usuarios"

const MIN_PASSWORD_LENGTH = 8

interface UsuarioPasswordDialogProps {
  open: boolean
  usuario: Usuario | null
  onClose: () => void
  onSubmit: (password: string) => Promise<void>
}

export function UsuarioPasswordDialog({
  open,
  usuario,
  onClose,
  onSubmit,
}: UsuarioPasswordDialogProps) {
  const [nueva, setNueva] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [errors, setErrors] = useState<{
    nueva: string | null
    confirmar: string | null
    general: string | null
  }>({ nueva: null, confirmar: null, general: null })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setNueva("")
    setConfirmar("")
    setErrors({ nueva: null, confirmar: null, general: null })
    setSubmitting(false)
  }, [open, usuario])

  function validate(): {
    nueva: string | null
    confirmar: string | null
    general: string | null
  } {
    const next: {
      nueva: string | null
      confirmar: string | null
      general: string | null
    } = { nueva: null, confirmar: null, general: null }
    if (nueva.length === 0) {
      next.nueva = "La contraseña es obligatoria."
    } else if (nueva.length < MIN_PASSWORD_LENGTH) {
      next.nueva = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    }
    if (confirmar.length === 0) {
      next.confirmar = "Confirma la nueva contraseña."
    } else if (nueva.length > 0 && confirmar !== nueva) {
      next.confirmar = "Las contraseñas no coinciden."
    }
    return next
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const validation = validate()
    const hasErrors =
      validation.nueva !== null ||
      validation.confirmar !== null ||
      validation.general !== null
    if (hasErrors) {
      setErrors(validation)
      return
    }

    setErrors({ nueva: null, confirmar: null, general: null })
    setSubmitting(true)

    try {
      await onSubmit(nueva)
      onClose()
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo actualizar la contraseña."
      const lower = message.toLowerCase()
      const routed =
        lower.includes("contraseña") || lower.includes("password")
          ? "nueva"
          : null
      setErrors({
        nueva: routed ? message : null,
        confirmar: null,
        general: routed ? null : message,
      })
      setSubmitting(false)
    }
  }

  function handleCancel() {
    if (submitting) return
    onClose()
  }

  const target = usuario?.nombre ?? "el usuario"

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleCancel()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            Define una nueva contraseña para {target}.
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
            <Field data-invalid={Boolean(errors.nueva)}>
              <FieldLabel htmlFor="usuario-nueva-password">
                Nueva contraseña
              </FieldLabel>
              <Input
                id="usuario-nueva-password"
                type="password"
                autoComplete="new-password"
                value={nueva}
                aria-invalid={Boolean(errors.nueva)}
                disabled={submitting}
                onChange={(event) => {
                  setNueva(event.target.value)
                  if (errors.nueva)
                    setErrors({ ...errors, nueva: null })
                }}
              />
              <FieldError>
                {errors.nueva ? errors.nueva : null}
              </FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.confirmar)}>
              <FieldLabel htmlFor="usuario-confirmar-password">
                Confirmar contraseña
              </FieldLabel>
              <Input
                id="usuario-confirmar-password"
                type="password"
                autoComplete="new-password"
                value={confirmar}
                aria-invalid={Boolean(errors.confirmar)}
                disabled={submitting}
                onChange={(event) => {
                  setConfirmar(event.target.value)
                  if (errors.confirmar)
                    setErrors({ ...errors, confirmar: null })
                }}
              />
              <FieldError>
                {errors.confirmar ? errors.confirmar : null}
              </FieldError>
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
              Actualizar contraseña
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
