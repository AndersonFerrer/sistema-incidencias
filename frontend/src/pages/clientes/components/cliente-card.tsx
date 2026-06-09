import {
  Copy,
  Pencil,
  Power,
  PowerOff,
  RefreshCcw,
  Trash2,
  AppWindow,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { AplicativoCliente } from "@/types/aplicativos"

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

function formatDate(value: string | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return dateFormatter.format(date)
}

function copyToClipboard(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return
  void navigator.clipboard.writeText(value)
}

type ClienteCardProps = {
  cliente: AplicativoCliente
  onEditar: (cliente: AplicativoCliente) => void
  onAlternarActivo: (cliente: AplicativoCliente) => void
  onRotarApiKey: (cliente: AplicativoCliente) => void
  onEliminar: (cliente: AplicativoCliente) => void
  isToggling?: boolean
  isRotating?: boolean
  isDeleting?: boolean
}

export function ClienteCard({
  cliente,
  onEditar,
  onAlternarActivo,
  onRotarApiKey,
  onEliminar,
  isToggling = false,
  isRotating = false,
  isDeleting = false,
}: ClienteCardProps) {
  const fecha = formatDate(cliente.creadoEn)
  const isActive = cliente.activo

  return (
    <Card className="flex flex-col gap-2.5 rounded-lg bg-white p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
            <AppWindow aria-hidden="true" className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col gap-0">
            <h3 className="truncate text-sm font-semibold text-slate-950">
              {cliente.nombre}
            </h3>
            {fecha ? (
              <p className="text-[11px] text-slate-500">Reg. {fecha}</p>
            ) : null}
          </div>
        </div>
        <Badge
          variant="outline"
          className={
            isActive
              ? "h-5 rounded-full border-blue-200 bg-blue-50 px-2.5 text-[10px] font-medium text-blue-700"
              : "h-5 rounded-full border-slate-200 bg-slate-100 px-2.5 text-[10px] font-medium text-slate-600"
          }
        >
          {isActive ? "Activo" : "Inactivo"}
        </Badge>
      </div>

      {cliente.descripcion ? (
        <p className="line-clamp-2 text-sm text-slate-600">
          {cliente.descripcion}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5 rounded-md border border-slate-200 bg-slate-50/60 px-2.5 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          API Key
        </span>
        <div className="flex items-center justify-between gap-2">
          <code className="truncate font-mono text-xs text-slate-700">
            {cliente.apiKey ?? "—"}
          </code>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              disabled={!cliente.apiKey}
              onClick={() =>
                cliente.apiKey ? copyToClipboard(cliente.apiKey) : undefined
              }
              aria-label="Copiar API key"
              className="text-slate-500 hover:text-slate-900"
            >
              <Copy aria-hidden="true" />
            </Button>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              disabled={isRotating}
              onClick={() => onRotarApiKey(cliente)}
              aria-label="Rotar API key"
              className="text-slate-500 hover:text-slate-900"
            >
              <RefreshCcw
                aria-hidden="true"
                className={isRotating ? "animate-spin" : undefined}
              />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-600">
        <span>
          <span className="font-semibold text-slate-900">
            {cliente.categoriasCount ?? 0}
          </span>{" "}
          {cliente.categoriasCount === 1 ? "categoría" : "categorías"}
        </span>
        <span>
          <span className="font-semibold text-slate-900">
            {cliente.solicitantesCount ?? 0}
          </span>{" "}
          {cliente.solicitantesCount === 1 ? "solicitante" : "solicitantes"}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-2">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => onEditar(cliente)}
          >
            <Pencil data-icon="inline-start" className="size-3" />
            Editar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={
              isActive
                ? "h-7 px-2.5 text-xs text-slate-700"
                : "h-7 px-2.5 text-xs text-emerald-700 hover:text-emerald-800"
            }
            disabled={isToggling}
            onClick={() => onAlternarActivo(cliente)}
          >
            {isActive ? (
              <>
                <PowerOff data-icon="inline-start" className="size-3" />
                Desactivar
              </>
            ) : (
              <>
                <Power data-icon="inline-start" className="size-3" />
                Activar
              </>
            )}
          </Button>
        </div>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          disabled={isDeleting}
          onClick={() => onEliminar(cliente)}
          aria-label={`Eliminar ${cliente.nombre}`}
          className="text-slate-400 hover:text-red-600"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </Card>
  )
}
