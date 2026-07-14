import { Link } from "@tanstack/react-router"
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  GitBranch,
  LayoutGrid,
  Shield,
  Tags,
  Users,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuthStore } from "@/store/auth-store"

const navigation = [
  { label: "Dashboard", icon: LayoutGrid, to: "/dashboard" },
  { label: "Incidencias", icon: AlertTriangle, to: "/incidencias" },
  { label: "Usuarios", icon: Users, to: "/usuarios" },
  { label: "Reportes", icon: BarChart3 },
]

const configuration = [
  { label: "Clientes", icon: Briefcase, to: "/clientes" },
  { label: "Categorías", icon: Tags, to: "/categorias" },
  { label: "Estados", icon: GitBranch },
]

function SidebarSection({
  title,
  items,
}: {
  title: string
  items: typeof navigation
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="px-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {title}
      </h2>
      <nav className="flex flex-col gap-0.5 px-2">
        {items.map((item) => {
          const Icon = item.icon
          const content = (
            <>
              <Icon aria-hidden="true" className="size-4" />
              <span>{item.label}</span>
            </>
          )

          if (item.to) {
            return (
              <Link
                key={item.label}
                to={item.to}
                activeProps={{
                  className:
                    "flex h-8 items-center gap-2.5 rounded-md px-3 text-sm font-medium bg-slate-800 text-blue-400",
                }}
                inactiveProps={{
                  className:
                    "flex h-8 items-center gap-2.5 rounded-md px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white",
                }}
              >
                {content}
              </Link>
            )
          }

          return (
            <button
              key={item.label}
              className="flex h-8 items-center gap-2.5 rounded-md px-3 text-left text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              type="button"
            >
              {content}
            </button>
          )
        })}
      </nav>
    </section>
  )
}

export function AppSidebar() {
  const user = useAuthStore((state) => state.user)
  const displayName = user?.nombre ?? "Carlos Méndez"
  const role = user?.rol ?? "Admin"
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside className="fixed inset-y-0 left-0 flex w-64 flex-col overflow-hidden border-r border-slate-800 bg-slate-950 text-white">
      <div className="flex h-[60px] items-center gap-2.5 border-b border-slate-800 px-4">
        <div className="flex size-8 items-center justify-center rounded-md bg-blue-600 text-white">
          <Shield aria-hidden="true" className="size-4" />
        </div>
        <div className="flex flex-col gap-0">
          <p className="text-sm font-semibold leading-none">GestIncidencias</p>
          <p className="text-[11px] text-slate-500">Sistema v1.0</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 py-4">
        <SidebarSection title="Navegación" items={navigation} />
        <SidebarSection title="Configuración" items={configuration} />
      </div>

      <div className="flex h-[60px] items-center gap-2.5 border-t border-slate-800 px-4">
        <Avatar className="size-7 bg-slate-800" size="default">
          <AvatarFallback className="bg-slate-800 text-[11px] font-semibold text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{displayName}</p>
          <p className="text-[11px] text-slate-500">{role}</p>
        </div>
      </div>
    </aside>
  )
}
