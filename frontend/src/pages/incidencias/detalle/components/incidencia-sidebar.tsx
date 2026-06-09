import { Calendar, type LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { EstadoAprobacionBadge } from "@/pages/incidencias/components/estado-badge"
import { PrioridadBadge } from "@/pages/incidencias/components/prioridad-badge"
import type { AplicativoCliente } from "@/types/aplicativos"
import type { Categoria } from "@/types/categorias"
import type { EstadoAprobacion } from "@/types/estados-aprobacion"
import type { Incidencia } from "@/types/incidencias"
import type { Usuario } from "@/types/usuarios"

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const dateTimeFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return dateFormatter.format(date)
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return dateTimeFormatter.format(date)
}

type IncidenciaSidebarProps = {
  incidencia: Incidencia
  estadoAprobacion: EstadoAprobacion | null
  categoria: Categoria | null
  aplicativo: AplicativoCliente | null
  solicitante: Usuario | null
  asignado: Usuario | null
}

function initials(nombre: string) {
  return nombre
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function PersonRow({ usuario }: { usuario: Usuario }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-6 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">
        {initials(usuario.nombre)}
      </div>
      <span className="truncate text-sm font-medium text-slate-900">
        {usuario.nombre}
      </span>
    </div>
  )
}

function SidebarRow({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-center gap-2">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        <Icon aria-hidden="true" className="size-3" />
        {label}
      </div>
      <div className="min-w-0 text-sm text-slate-900">{children}</div>
    </div>
  )
}

export function IncidenciaSidebar({
  incidencia,
  estadoAprobacion,
  categoria,
  aplicativo,
  solicitante,
  asignado,
}: IncidenciaSidebarProps) {
  return (
    <Card className="rounded-lg bg-white shadow-sm">
      <CardContent className="flex flex-col gap-2.5 p-3.5">
        <SidebarRow label="Estado" icon={Calendar}>
          {estadoAprobacion ? (
            <EstadoAprobacionBadge estado={estadoAprobacion} />
          ) : (
            <span className="text-slate-500">—</span>
          )}
        </SidebarRow>

        <SidebarRow label="Prioridad" icon={Calendar}>
          <PrioridadBadge prioridad={incidencia.prioridad} />
        </SidebarRow>

        <SidebarRow label="Categoría" icon={Calendar}>
          <span className="truncate font-medium text-slate-900">
            {categoria?.nombre ?? "Sin categoría"}
          </span>
        </SidebarRow>

        <SidebarRow label="Cliente" icon={Calendar}>
          {aplicativo ? (
            <span className="truncate font-medium text-slate-900">
              {aplicativo.nombre}
            </span>
          ) : (
            <span className="text-slate-500">Sin cliente</span>
          )}
        </SidebarRow>

        <SidebarRow label="Responsable" icon={Calendar}>
          {asignado ? (
            <PersonRow usuario={asignado} />
          ) : (
            <span className="text-slate-500">Sin asignar</span>
          )}
        </SidebarRow>

        <SidebarRow label="Solicitante" icon={Calendar}>
          {solicitante ? (
            <PersonRow usuario={solicitante} />
          ) : (
            <span className="text-slate-500">—</span>
          )}
        </SidebarRow>

        <SidebarRow label="Creado" icon={Calendar}>
          {formatDate(incidencia.creadoEn)}
        </SidebarRow>

        {incidencia.resueltoEn ? (
          <SidebarRow label="Resuelto" icon={Calendar}>
            {formatDateTime(incidencia.resueltoEn)}
          </SidebarRow>
        ) : null}
      </CardContent>
    </Card>
  )
}
