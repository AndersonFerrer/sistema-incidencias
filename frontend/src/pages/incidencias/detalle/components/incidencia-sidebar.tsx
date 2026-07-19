import {
  Building2,
  CalendarCheck,
  CalendarPlus,
  Flag,
  GitBranch,
  ShieldCheck,
  Tag,
  User,
  UserCircle,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EstadoAprobacionBadge } from "@/pages/incidencias/components/estado-badge";
import { IncidenciaEstadoProcesoBadge } from "@/pages/incidencias/components/incidencia-estado-proceso-badge";
import { PrioridadBadge } from "@/pages/incidencias/components/prioridad-badge";
import type { AplicativoCliente } from "@/types/aplicativos";
import type { Categoria } from "@/types/categorias";
import type { EstadoAprobacion } from "@/types/estados-aprobacion";
import type {
  EstadoProcesoClave,
  Incidencia,
} from "@/types/incidencias";
import type { EstadoProceso } from "@/types/estados-proceso";
import type { Usuario } from "@/types/usuarios";

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateTimeFormatter.format(date);
}

type EstadoProcesoClaveNoVacia = Exclude<EstadoProcesoClave, string>;

function isEstadoProcesoClave(
  valor: string
): valor is EstadoProcesoClaveNoVacia {
  return valor === "PENDIENTE" || valor === "EN_PROCESO" || valor === "FINALIZADA";
}

type IncidenciaSidebarProps = {
  incidencia: Incidencia;
  estadoAprobacion: EstadoAprobacion | null;
  estadoProceso: EstadoProceso | null;
  categoria: Categoria | null;
  aplicativo: AplicativoCliente | null;
  solicitante: Usuario | null;
  asignado: Usuario | null;
  /**
   * Rol del usuario actual. Se usa para esconder campos sensibles para
   * no-admin segun el RF pendiente: AGENTE/USUARIO no ven solicitante,
   * responsable, cliente, categoria, ni estado de aprobacion.
   * El backend tambien sanitiza (defense in depth) via IncidenciaService
   * pero el frontend refuerza ocultando las filas correspondientes.
   *
   * Tipo string (no union estricta) porque auth-store devuelve `rol: string`
   * sin narrowing centralizado. La comparacion interna con === "ADMINISTRADOR"
   * maneja el resto.
   */
  currentUserRol: string;
};

function initials(nombre: string) {
  return nombre
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
  );
}

function SidebarRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[108px_1fr] items-center gap-2">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        <Icon aria-hidden="true" className="size-3" />
        {label}
      </div>
      <div className="min-w-0 text-sm text-slate-900">{children}</div>
    </div>
  );
}

export function IncidenciaSidebar({
  incidencia,
  estadoAprobacion,
  estadoProceso,
  categoria,
  aplicativo,
  solicitante,
  asignado,
  currentUserRol,
}: IncidenciaSidebarProps) {
  const estadoProcesoClave =
    estadoProceso && isEstadoProcesoClave(estadoProceso.clave)
      ? estadoProceso.clave
      : null;
  const estadoProcesoEtiqueta = estadoProceso?.etiqueta ?? null;

  // RBAC: estos campos solo para ADMIN. AGENTE/USUARIO los tienen bloqueados.
  const isAdmin = currentUserRol === "ADMINISTRADOR";

  return (
    <Card className="rounded-lg bg-white shadow-sm">
      <CardContent className="flex flex-col gap-2.5 p-3.5">
        {isAdmin && (
          <SidebarRow label="Estado (aprob.)" icon={ShieldCheck}>
            {estadoAprobacion ? (
              <EstadoAprobacionBadge estado={estadoAprobacion} />
            ) : (
              <span className="text-slate-500">—</span>
            )}
          </SidebarRow>
        )}

        <SidebarRow label="Estado (proceso)" icon={GitBranch}>
          {estadoProcesoClave ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <IncidenciaEstadoProcesoBadge clave={estadoProcesoClave} />
              {estadoProcesoEtiqueta &&
              estadoProcesoEtiqueta !==
                ({
                  PENDIENTE: "Pendiente",
                  EN_PROCESO: "En proceso",
                  FINALIZADA: "Finalizada",
                }[estadoProcesoClave]) ? (
                <span className="text-[11px] text-slate-500">
                  {estadoProcesoEtiqueta}
                </span>
              ) : null}
            </div>
          ) : (
            <span className="text-slate-500">—</span>
          )}
        </SidebarRow>

        <SidebarRow label="Prioridad" icon={Flag}>
          <PrioridadBadge prioridad={incidencia.prioridad} />
        </SidebarRow>

        {isAdmin && (
          <SidebarRow label="Categoría" icon={Tag}>
            <span className="truncate font-medium text-slate-900">
              {categoria?.nombre ?? "Sin categoría"}
            </span>
          </SidebarRow>
        )}

        {isAdmin && (
          <SidebarRow label="Cliente" icon={Building2}>
            {aplicativo ? (
              <span className="truncate font-medium text-slate-900">
                {aplicativo.nombre}
              </span>
            ) : (
              <span className="text-slate-500">Sin cliente</span>
            )}
          </SidebarRow>
        )}

        {isAdmin && (
          <SidebarRow label="Responsable" icon={User}>
            {asignado ? (
              <PersonRow usuario={asignado} />
            ) : (
              <span className="text-slate-500">Sin asignar</span>
            )}
          </SidebarRow>
        )}

        {isAdmin && (
          <SidebarRow label="Solicitante" icon={UserCircle}>
            {solicitante ? (
              <PersonRow usuario={solicitante} />
            ) : (
              <span className="text-slate-500">—</span>
            )}
          </SidebarRow>
        )}

        <SidebarRow label="Creado" icon={CalendarPlus}>
          {formatDate(incidencia.creadoEn)}
        </SidebarRow>

        {incidencia.resueltoEn ? (
          <SidebarRow label="Resuelto" icon={CalendarCheck}>
            {formatDateTime(incidencia.resueltoEn)}
          </SidebarRow>
        ) : null}
      </CardContent>
    </Card>
  );
}
