import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ApiError } from "@/lib/http"
import type { Usuario } from "@/types/usuarios"

const CONFIRM_PLACEHOLDER = "ELIMINAR"

interface UsuarioDeleteDialogProps {
  open: boolean
  usuario: Usuario | null
  onClose: () => void
  onConfirm: (id: string) => Promise<void>
}

export function UsuarioDeleteDialog({
  open,
  usuario,
  onClose,
  onConfirm,
}: UsuarioDeleteDialogProps) {
  const [typed, setTyped] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    setTyped("")
    setErrorMsg(null)
    setSubmitting(false)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open, usuario])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    if (!usuario) return
    if (typed.trim().toUpperCase() !== CONFIRM_PLACEHOLDER) {
      setErrorMsg(`Escribe ${CONFIRM_PLACEHOLDER} para confirmar.`)
      return
    }
    setErrorMsg(null)
    setSubmitting(true)
    try {
      await onConfirm(usuario.id)
      onClose()
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo eliminar el usuario."
      setErrorMsg(message)
      setSubmitting(false)
    }
  }

  const target = usuario?.nombre ?? "este usuario"
  const canSubmit = typed.trim().toUpperCase() === CONFIRM_PLACEHOLDER

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) onClose()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar usuario</DialogTitle>
          <DialogDescription>
            Esta accion realiza un soft delete en <strong>{target}</strong> (
            {usuario?.email}). El registro se conserva pero deja de poder
            iniciar sesion.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Para confirmar, escribe{" "}
            <code className="rounded bg-amber-100 px-1 font-mono font-semibold">
              {CONFIRM_PLACEHOLDER}
            </code>{" "}
            debajo.
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="usuario-delete-confirmar"
              className="text-xs font-medium text-slate-700"
            >
              Confirmacion textual
            </label>
            <Input
              id="usuario-delete-confirmar"
              ref={inputRef}
              autoComplete="off"
              value={typed}
              disabled={submitting}
              aria-invalid={Boolean(errorMsg)}
              onChange={(event) => {
                setTyped(event.target.value)
                if (errorMsg) setErrorMsg(null)
              }}
              placeholder={CONFIRM_PLACEHOLDER}
            />
            {errorMsg ? (
              <p
                role="alert"
                className="text-xs font-normal text-destructive"
              >
                {errorMsg}
              </p>
            ) : null}
          </div>

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              className="h-8 px-3"
              disabled={submitting || !canSubmit}
            >
              {submitting ? (
                <Spinner data-icon="inline-start" />
              ) : null}
              Eliminar usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
