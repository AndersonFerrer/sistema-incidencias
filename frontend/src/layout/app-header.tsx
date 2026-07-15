import { LogOut, PanelLeft, Bell } from "lucide-react"
import { useRouterState } from "@tanstack/react-router"
import { useState } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { NotificationDropdown } from "@/components/notifications/notification-dropdown"
import { useNotificationsPolling } from "@/hooks/use-notifications-polling"
import { useAuthStore } from "@/store/auth-store"

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/incidencias": "Incidencias",
  "/clientes": "Clientes",
  "/categorias": "Categorías",
  "/notificaciones": "Notificaciones",
  "/perfil": "Mi perfil",
}

function getRouteTitle(pathname: string) {
  return routeTitles[pathname] ?? "GestIncidencias"
}

export function AppHeader() {
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

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const title = getRouteTitle(pathname)

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

  return (
    <header className="fixed left-64 right-0 top-0 flex h-[60px] items-center justify-between border-b border-slate-200 bg-white px-5">
      <div className="flex items-center gap-3">
        <PanelLeft aria-hidden="true" className="size-4 text-slate-800" />
        <p className="text-sm font-semibold text-slate-900">{title}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
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

          <NotificationDropdown
            open={bellOpen}
            onOpenChange={setBellOpen}
            onCountChanged={refreshCount}
          />
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center gap-2">
          <Avatar className="size-7 bg-blue-50" size="default">
            <AvatarFallback className="bg-blue-50 text-[11px] font-semibold text-blue-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-24">
            <p className="text-xs font-semibold leading-tight text-slate-900">
              {displayName}
            </p>
            <p className="text-[10px] text-slate-500">{role}</p>
          </div>
        </div>

        <Button
          aria-label="Cerrar sesión"
          size="icon-sm"
          variant="ghost"
          onClick={logout}
        >
          <LogOut className="size-3.5" />
        </Button>
      </div>
    </header>
  )
}
