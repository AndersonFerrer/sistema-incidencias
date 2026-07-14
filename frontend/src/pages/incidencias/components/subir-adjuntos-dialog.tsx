import { Paperclip, Upload, X } from "lucide-react"
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
import { Spinner } from "@/components/ui/spinner"
import { ApiError } from "@/lib/http"
import { cn } from "@/lib/utils"

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024
const PROGRESS_DURATION_MS = 2000

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

type FileEntry = {
  id: string
  file: File
  progress: number
  error: string | null
}

interface SubirAdjuntosDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (files: File[]) => Promise<void>
}

function makeFileId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

export function SubirAdjuntosDialog({
  open,
  onClose,
  onSubmit,
}: SubirAdjuntosDialogProps) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const dragCounterRef = useRef(0)

  useEffect(() => {
    if (!open) return
    setFiles([])
    setIsDragging(false)
    setSubmitting(false)
    setGeneralError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [open])

  useEffect(() => {
    return () => {
      setFiles([])
    }
  }, [])

  function addFiles(incoming: File[]) {
    if (incoming.length === 0) return
    setGeneralError(null)
    setFiles((prev) => {
      const next: FileEntry[] = [...prev]
      incoming.forEach((file) => {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          next.push({
            id: makeFileId(file),
            file,
            progress: 0,
            error: `Archivo demasiado grande (máx. ${formatBytes(
              MAX_FILE_SIZE_BYTES
            )}).`,
          })
        } else {
          next.push({
            id: makeFileId(file),
            file,
            progress: 0,
            error: null,
          })
        }
      })
      return next
    })
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const list = event.target.files
    if (!list || list.length === 0) return
    addFiles(Array.from(list))
    event.target.value = ""
  }

  function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    dragCounterRef.current += 1
    if (event.dataTransfer.types.includes("Files")) {
      setIsDragging(true)
    }
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDragging(false)
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    dragCounterRef.current = 0
    setIsDragging(false)
    const list = event.dataTransfer.files
    if (list && list.length > 0) {
      addFiles(Array.from(list))
    }
  }

  function removerArchivo(id: string) {
    if (submitting) return
    setFiles((prev) => prev.filter((entry) => entry.id !== id))
  }

  function progressFor(id: string, value: number) {
    setFiles((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              progress: Math.max(0, Math.min(100, value)),
            }
          : entry
      )
    )
  }

  async function simulateProgress(id: string): Promise<void> {
    return new Promise((resolve) => {
      const startedAt = performance.now()
      const tick = () => {
        const elapsed = performance.now() - startedAt
        const ratio = Math.min(1, elapsed / PROGRESS_DURATION_MS)
        progressFor(id, ratio * 100)
        if (ratio >= 1) {
          resolve()
          return
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  }

  const archivosListos = files.filter((entry) => entry.error === null)
  const archivosConError = files.filter((entry) => entry.error !== null)
  const puedeEnviar =
    !submitting && archivosListos.length > 0 && archivosConError.length === 0

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!puedeEnviar) return

    setSubmitting(true)
    setGeneralError(null)

    try {
      await Promise.all(
        archivosListos.map((entry) => simulateProgress(entry.id))
      )
      await onSubmit(archivosListos.map((entry) => entry.file))
      onClose()
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudieron subir los archivos."
      setGeneralError(message)
      setSubmitting(false)
    }
  }

  function handleCancel() {
    if (submitting) return
    onClose()
  }

  function handleRemoveErrorEntry(id: string) {
    setFiles((prev) => prev.filter((entry) => entry.id !== id))
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
          <DialogTitle>Subir adjuntos</DialogTitle>
          <DialogDescription>
            Arrastra archivos al área indicada o haz clic para seleccionarlos.
            El progreso es simulado porque el backend no expone carga por
            fragmentos.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1"
          onSubmit={handleSubmit}
          noValidate
        >
          {generalError ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-sm text-destructive"
            >
              {generalError}
            </div>
          ) : null}

          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-slate-50 px-4 py-6 text-center text-sm transition-colors",
              isDragging
                ? "border-primary bg-primary/5 text-primary"
                : "border-slate-300 text-slate-600 hover:bg-slate-100",
              submitting && "pointer-events-none opacity-60"
            )}
            onClick={() => {
              if (!submitting) fileInputRef.current?.click()
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            aria-label="Soltar archivos aquí o hacer clic para seleccionar"
          >
            <Upload
              aria-hidden="true"
              className={cn(
                "size-6",
                isDragging ? "text-primary" : "text-slate-400"
              )}
            />
            <span className="text-sm font-medium">
              {isDragging
                ? "Suelta los archivos para agregarlos"
                : "Arrastra archivos aquí"}
            </span>
            <span className="text-xs text-slate-500">
              o haz clic para seleccionarlos desde tu dispositivo
            </span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              disabled={submitting}
              onChange={handleInputChange}
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
            />
          </div>

          {files.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {files.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-col gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Paperclip
                        aria-hidden="true"
                        className="size-3.5 shrink-0 text-slate-400"
                      />
                      <span className="truncate text-slate-700">
                        {entry.file.name}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {formatBytes(entry.file.size)} · {entry.file.type || "tipo desconocido"}
                      </span>
                    </div>
                    {entry.error ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveErrorEntry(entry.id)}
                        disabled={submitting}
                        aria-label={`Quitar ${entry.file.name}`}
                        className="flex size-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X aria-hidden="true" className="size-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removerArchivo(entry.id)}
                        disabled={submitting}
                        aria-label={`Quitar ${entry.file.name}`}
                        className="flex size-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X aria-hidden="true" className="size-3.5" />
                      </button>
                    )}
                  </div>
                  {entry.error ? (
                    <p className="text-[11px] text-destructive">
                      {entry.error}
                    </p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(entry.progress)}
                        aria-label={`Progreso de ${entry.file.name}`}
                      >
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            submitting
                              ? "bg-primary"
                              : entry.progress >= 100
                                ? "bg-emerald-500"
                                : "bg-primary/70"
                          )}
                          style={{ width: `${entry.progress}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-[11px] tabular-nums text-slate-500">
                        {Math.round(entry.progress)}%
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : null}

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
              disabled={!puedeEnviar}
            >
              {submitting ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Upload data-icon="inline-start" className="size-3.5" />
              )}
              {submitting
                ? "Subiendo..."
                : archivosListos.length > 1
                  ? `Subir ${archivosListos.length} archivos`
                  : archivosListos.length === 1
                    ? "Subir archivo"
                    : "Subir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}