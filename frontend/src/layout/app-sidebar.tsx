import { Link } from "@tanstack/react-router"
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  ChevronsUpDown,
  LayoutGrid,
  LogOut,
  Settings,
  Shield,
  Tags,
  UserRound,
  Users,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuthStore } from "@/store/auth-store"
import { useState } from "react"

type SidebarItem = {
  label: string
  icon: typeof LayoutGrid
  to?: string
  /**
   * Si `true`, el item solo se muestra a `ADMINISTRADOR`. Refleja la regla
   * de negocio del backend: AGENTE y USUARIO no tienen acceso (los endpoints
   * devuelven 403 y las paginas renderizan vacias). El sidebar se filtra
   * para que la UX sea consistente.
   */
  adminOnly?: boolean
}

const navigation: SidebarItem[] = [
  { label: "Dashboard", icon: LayoutGrid, to: "/dashboard" },
  { label: "Incidencias", icon: AlertTriangle, to: "/incidencias" },
  { label: "Usuarios", icon: Users, to: "/usuarios", adminOnly: true },
  { label: "Reportes", icon: BarChart3, to: "/reportes" },
]

const configuration: SidebarItem[] = [
  { label: "Clientes", icon: Briefcase, to: "/clientes", adminOnly: true },
  { label: "Categorías", icon: Tags, to: "/categorias", adminOnly: true },
  {
    label: "Configuración",
    icon: Settings,
    to: "/configuracion",
    adminOnly: true,
  },
]

function filterByRole(items: SidebarItem[], isAdmin: boolean): SidebarItem[] {
  return items.filter((item) => isAdmin || !item.adminOnly)
}

type AppSidebarProps = {
  /**
   * `true` = sidebar en su ancho completo (w-64) o drawer visible (mobile).
   * `false` = sidebar colapsado a iconos (w-16) en desktop, o drawer oculto en mobile.
   */
  open: boolean
  /**
   * Llamado por el backdrop o al hacer click en una opcion en mobile.
   * En desktop no-op visual; el sidebar se mantiene docked.
   */
  onClose?: () => void
}

/**
 * Sidebar principal del layout. Se adapta a desktop (docked, colapsable
 * a iconos via prop `open`) y a mobile (drawer overlay via misma prop).
 *
 * Anchos:
 * - Desktop open:      w-64 (256px) con labels
 * - Desktop collapsed: w-16 ( 64px) solo iconos
 * - Mobile open:       w-64 fixed + translate-x-0 (drawer visible)
 * - Mobile closed:     w-64 fixed + -translate-x-full (drawer oculto)
 */
export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const isAdmin = user?.rol === "ADMINISTRADOR"
  const displayName = user?.nombre ?? "Carlos Méndez"
  const role = user?.rol ?? "Admin"
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const [menuOpen, setMenuOpen] = useState(false)

  // Filtrar items por rol para que la UX del sidebar refleje la regla del
  // backend. AGENTE / USUARIO ven solo Dashboard / Incidencias / Reportes
  // (Reportes se filtra por scope a nivel SQL). ADMIN ve el menu completo.
  const navigationItems = (() =>
    filterByRole(navigation, isAdmin))()
  const configurationItems = (() =>
    filterByRole(configuration, isAdmin))()

  // Clases segun el modo:
  // - Mobile drawer: siempre w-64 fixed. Visibilidad controlada por translate-x.
  // - Desktop: width segun `open`. Siempre fixed (no translate).
  const sidebarContainerClass = [
    // Base: dark sidebar, flex column, fixed, top-bottom, transition.
    "fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-slate-800 bg-slate-950 text-white transition-[width,transform] duration-200 ease-in-out",
    // Mobile (default): siempre w-64. translate-x-0 cuando open, -translate-x-full cuando cerrado.
    "w-64",
    open ? "translate-x-0" : "-translate-x-full",
    // Desktop (md+): docked, sin translate. Width segun open.
    "md:translate-x-0",
    open ? "md:w-64" : "md:w-16",
  ].join(" ")

  // Cerramos el menu dropdown al colapsar el sidebar para evitar overflow visual.
  const isCollapsedDesktop = !open

  return (
    <aside
      aria-label="Menu principal"
      className={sidebarContainerClass}
    >
      {/* Header del sidebar: logo (siempre) + titulo (cuando expandido).
          El toggle de colapsar vive en el AppHeader (un solo lugar para evitar
          confusion visual cuando el sidebar esta colapsado). */}
      <div className="flex h-[60px] shrink-0 items-center gap-2.5 border-b border-slate-800 px-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
          <Shield aria-hidden="true" className="size-4" />
        </div>
        <p
          className={`text-sm font-semibold leading-none whitespace-nowrap transition-opacity duration-200 ${
            open ? "opacity-100" : "w-0 overflow-hidden opacity-0"
          }`}
        >
          GestIncidencias
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto py-4">
        {navigationItems.length > 0 ? (
          <SidebarSection
            title="Navegación"
            items={navigationItems}
            showLabels={open}
            onNavigate={onClose}
          />
        ) : null}
        {configurationItems.length > 0 ? (
          <SidebarSection
            title="Configuración"
            items={configurationItems}
            showLabels={open}
            onNavigate={onClose}
          />
        ) : null}
      </div>

      <SidebarUser
        displayName={displayName}
        role={role}
        initials={initials}
        expanded={open}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        collapsed={isCollapsedDesktop}
        logout={logout}
      />
    </aside>
  )
}

function SidebarSection({
  title,
  items,
  showLabels,
  onNavigate,
}: {
  title: string
  items: SidebarItem[]
  showLabels: boolean
  onNavigate?: () => void
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2
        className={`px-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 transition-opacity ${
          showLabels ? "opacity-100" : "opacity-0"
        }`}
      >
        {title}
      </h2>
      <nav className="flex flex-col gap-0.5 px-2">
        {items.map((item) => {
          const Icon = item.icon
          const content = (
            <>
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span
                className={`whitespace-nowrap transition-opacity ${
                  showLabels ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                {item.label}
              </span>
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
                onClick={onNavigate}
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

function SidebarUser({
  displayName,
  role,
  initials,
  expanded,
  menuOpen,
  setMenuOpen,
  collapsed,
  logout,
}: {
  displayName: string
  role: string
  initials: string
  expanded: boolean
  menuOpen: boolean
  setMenuOpen: (v: boolean) => void
  collapsed: boolean
  logout: () => void
}) {
  return (
    <div className="relative border-t border-slate-800 px-2 py-2">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={`Menu de ${displayName}`}
        onClick={() => setMenuOpen(!menuOpen)}
        className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-slate-800 ${
          expanded ? "" : "justify-center"
        }`}
      >
        <Avatar className="size-7 bg-slate-800" size="default">
          <AvatarFallback className="bg-slate-800 text-[11px] font-semibold text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div
          className={`min-w-0 flex-1 overflow-hidden transition-[max-width,opacity] duration-200 ${
            expanded ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0"
          }`}
        >
          <p className="truncate text-xs font-semibold">{displayName}</p>
          <p className="truncate text-[11px] text-slate-500">{role}</p>
        </div>
        {expanded ? (
          <ChevronsUpDown
            aria-hidden="true"
            className="size-3.5 shrink-0 text-slate-500"
          />
        ) : null}
      </button>

      {menuOpen ? (
        <div
          role="menu"
          aria-label="Menu del usuario"
          className={`absolute bottom-[calc(100%-0.25rem)] z-10 flex flex-col gap-0.5 overflow-hidden rounded-md border border-slate-800 bg-slate-900 p-1 shadow-xl shadow-black/40 ${
            collapsed
              ? "left-2 right-2"
              : expanded
                ? "left-2 right-2"
                : "left-2 right-2"
          }`}
        >
          <Link
            to="/perfil"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <UserRound aria-hidden="true" className="size-3.5" />
            <span>Mi perfil</span>
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false)
              logout()
            }}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <LogOut aria-hidden="true" className="size-3.5" />
            <span>Cerrar sesion</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
