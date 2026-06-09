import { LogOut, PanelLeft, Bell } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/incidencias": "Incidencias",
  "/clientes": "Clientes",
};

function getRouteTitle(pathname: string) {
  return routeTitles[pathname] ?? "GestIncidencias";
}

export function AppHeader() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const displayName = user?.nombre ?? "Carlos Méndez";
  const role = user?.rol ?? "Admin";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const title = getRouteTitle(pathname);

  return (
    <header className="fixed left-64 right-0 top-0 flex h-[70px] items-center justify-between border-b border-slate-200 bg-white px-7">
      <div className="flex items-center gap-7">
        <PanelLeft aria-hidden="true" className="size-5 text-slate-800" />
        <p className="text-sm font-semibold text-slate-900">{title}</p>
      </div>

      <div className="flex items-center gap-5">
        <button
          className="relative flex size-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          type="button"
          aria-label="Notificaciones"
        >
          <Bell aria-hidden="true" className="size-6" />
          <span className="absolute right-1 top-0 flex size-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold leading-none text-white">
            4
          </span>
        </button>

        <div className="h-11 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <Avatar className="bg-blue-50" size="lg">
            <AvatarFallback className="bg-blue-50 text-sm font-semibold text-blue-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-32">
            <p className="text-sm font-semibold leading-tight text-slate-900">
              {displayName}
            </p>
            <p className="text-xs text-slate-500">{role}</p>
          </div>
        </div>

        <Button
          aria-label="Cerrar sesión"
          size="icon"
          variant="ghost"
          onClick={logout}
        >
          <LogOut />
        </Button>
      </div>
    </header>
  );
}
