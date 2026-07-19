import { LogOut, Menu, Bell, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { useState } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { NotificationDropdown } from "@/components/notifications/notification-dropdown"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { useNotificationsPolling } from "@/hooks/use-notifications-polling"
import { useAuthStore } from "@/store/auth-store"

type AppHeaderProps = {
  /**
   * Estado del sidebar:
   * - Mobile: si esta abierto (drawer visible) o cerrado (drawer oculto).
   * - Desktop: si esta expandido (w-64) o colapsado (w-16).
   */
  sidebarOpen: boolean
  /**
   * Toggle del sidebar — abre/cierra el drawer en mobile; expande/colapsa
   * en desktop. El boton del header llama esto; AppLayout realiza la
   * logica de cambio de estado.
   */
  onToggleSidebar: () => void
}

/**
 * Header de 60px, fijo arriba. Su offset-left sigue al sidebar
 * (md:left-64 cuando expandido, md:left-16 cuando colapsado, left-0 en mobile).
 * El icono izquierdo cambia segun el modo:
 *   - mobile cerrado:        Menu (hamburguesa) -> abre drawer.
 *   - mobile abierto:        X / Menu abierto -> cierra drawer.
 *   - desktop expandido:     PanelLeftClose -> colapsa a iconos.
 *   - desktop colapsado:     PanelLeftOpen -> expande.
 * El header no contiene breadcrumbs (quedo en AppHeader historial pero ahora lo movimos al
 * AppLayout como PageBreadcrumb? No, segun la conversacion previa el breadcrumb esta en AppHeader).
 * Aqui mostramos solo breadcrumb + iconos de accion.
 */
export function AppHeader({ sidebarOpen, onToggleSidebar }: AppHeaderProps) {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const displayName = user?.nombre ?? "Carlos Méndez"
  const role = user?.rol ?? "Admin"
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const [bellOpen, setBellOpen] = useState(false)
  const { count, refresh: refreshCount } = useNotificationsPolling()

  // El badge sigue el contrato: oculto si count == 0. Mostrar `99+` para no
  // romper el layout del pill cuando el numero crece.
  const badgeText =
    count === null || count <= 0
      ? null
      : count > 99
      ? "99+"
      : String(count)

  // El icono del toggle varia segun el estado y el viewport.
  // - desktop expandido: PanelLeftClose (collapse to icons)
  // - desktop colapsado: PanelLeftOpen (expand)
  // - mobile: Menu / X segun abierto/cerrado (handled por la clase `md:hidden`)
  // Para evitar mostrar dos iconos superpuestos cuando el sidebar esta en distintos
  // estados, renderizamos dos botones con clases responsive que ocultan uno u otro
  // segun `md:`.
  return (
    <header
      className={`fixed top-0 right-0 left-0 ${
        sidebarOpen ? "md:left-64" : "md:left-16"
      } h-[60px] bg-white border-b border-slate-200 transition-[left] duration-200 ease-in-out z-30`}
    >
      <div className="flex h-full items-center justify-between gap-3 px-3 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {/* Toggle mobile: solo visible <md, abre/cierra el drawer */}
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={onToggleSidebar}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>
          {/* Toggle desktop: colapsar/expandir. Solo visible >=md. */}
          <button
            type="button"
            aria-label={sidebarOpen ? "Colapsar menu" : "Expandir menu"}
            onClick={onToggleSidebar}
            className="hidden size-8 shrink-0 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-slate-100 md:flex"
          >
            {sidebarOpen ? (
              <PanelLeftClose aria-hidden="true" className="size-4" />
            ) : (
              <PanelLeftOpen aria-hidden="true" className="size-4" />
            )}
          </button>
          {/* Breadcrumb: min-w-0 + flex-1 permite que se encoja y use truncate en
              lugar de empujar a los iconos de la derecha fuera del header. */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <PageBreadcrumb />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <NotificationDropdown
            trigger={
              <button
                className="relative flex size-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                type="button"
                aria-label="Notificaciones"
                aria-expanded={bellOpen}
                aria-haspopup="dialog"
                onClick={() => setBellOpen((prev) => !prev)}
              >
                <Bell aria-hidden="true" className="size-4" />
                {badgeText ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {badgeText}
                  </span>
                ) : null}
              </button>
            }
            open={bellOpen}
            onOpenChange={setBellOpen}
            onCountChanged={refreshCount}
          />

          <div className="hidden h-6 w-px bg-slate-200 sm:block" />

          <div className="hidden items-center gap-2 sm:flex">
            <Avatar className="size-7 bg-blue-50" size="default">
              <AvatarFallback className="bg-blue-50 text-[11px] font-semibold text-blue-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 max-w-[140px]">
              <p className="truncate text-xs font-semibold leading-tight text-slate-900">
                {displayName}
              </p>
              <p className="truncate text-[10px] text-slate-500">{role}</p>
            </div>
          </div>

          <Button
            aria-label="Cerrar sesion"
            size="icon-sm"
            variant="ghost"
            onClick={logout}
          >
            <LogOut className="size-3.5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
