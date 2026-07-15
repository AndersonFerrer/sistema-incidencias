import {
  Download,
  File as FileIcon,
  FileImage,
  FileText,
  Paperclip,
  Plus,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { IncidenciaAdjunto } from "@/types/incidencias"

const KB = 1024
const MB = 1024 * KB

function formatBytes(bytes: number) {
  if (bytes >= MB) {
    return `${(bytes / MB).toFixed(1)} MB`
  }
  if (bytes >= KB) {
    return `${(bytes / KB).toFixed(1)} KB`
  }
  return `${bytes} B`
}

function getAdjuntoIcon(tipoMime: string) {
  if (tipoMime.startsWith("image/")) return FileImage
  if (tipoMime === "application/pdf" || tipoMime.startsWith("text/")) {
    return FileText
  }
  return FileIcon
}

type IncidenciaAdjuntosCardProps = {
  adjuntos: IncidenciaAdjunto[]
  baseUrl?: string
  /**
   * Role gate for the "Añadir adjuntos" CTA. Only ADMINISTRADOR / AGENTE
   * can upload additional adjuntos per the Slice D role matrix (Task 14).
   */
  puedeSubir?: boolean
  onSubirAdjuntos?: () => void
}

export function IncidenciaAdjuntosCard({
  adjuntos,
  baseUrl,
  puedeSubir = false,
  onSubirAdjuntos,
}: IncidenciaAdjuntosCardProps) {
  const resolveUrl = (url: string) => {
    if (baseUrl && url.startsWith("/")) {
      return `${baseUrl}${url}`
    }
    return url
  }

  const header = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <Paperclip aria-hidden="true" className="size-3.5 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-950">
          Adjuntos ({adjuntos.length})
        </h2>
      </div>
      {puedeSubir && onSubirAdjuntos ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2.5"
          onClick={onSubirAdjuntos}
        >
          <Plus data-icon="inline-start" className="size-3.5" />
          Añadir adjuntos
        </Button>
      ) : null}
    </div>
  )

  // Hide the entire card when there are no adjuntos AND the current role
  // can't upload — keeps the detail page quiet for USUARIO viewing.
  if (adjuntos.length === 0) {
    if (!puedeSubir) return null
    return (
      <Card className="rounded-lg bg-white shadow-sm">
        <CardContent className="flex flex-col gap-2 p-3.5">{header}</CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-lg bg-white shadow-sm">
      <CardContent className="flex flex-col gap-2 p-3.5">
        {header}

        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {adjuntos.map((adjunto) => {
            const Icon = getAdjuntoIcon(adjunto.tipoMime)
            const isImage = adjunto.tipoMime.startsWith("image/")
            return (
              <li
                key={adjunto.id}
                className="group flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                {isImage ? (
                  <a
                    href={resolveUrl(adjunto.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex shrink-0"
                    aria-label={`Vista previa de ${adjunto.nombreArchivo}`}
                  >
                    <img
                      src={resolveUrl(adjunto.url)}
                      alt={adjunto.nombreArchivo}
                      className="size-9 rounded object-cover ring-1 ring-slate-200"
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-md",
                      "bg-slate-100 text-slate-500"
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-slate-900">
                    {adjunto.nombreArchivo}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {formatBytes(adjunto.tamanoBytes)}
                  </span>
                </div>
                <a
                  href={resolveUrl(adjunto.url)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Descargar ${adjunto.nombreArchivo}`}
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  <Download aria-hidden="true" className="size-3.5" />
                </a>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
