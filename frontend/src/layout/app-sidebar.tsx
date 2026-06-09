import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  GitBranch,
  LayoutGrid,
  Shield,
  Tags,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth-store";

const navigation = [
  { label: "Dashboard", icon: LayoutGrid, to: "/dashboard" },
  { label: "Incidencias", icon: AlertTriangle, to: "/incidencias" },
  { label: "Usuarios", icon: Users },
  { label: "Reportes", icon: BarChart3 },
];

const configuration = [
  { label: "Clientes", icon: Briefcase },
  { label: "Categorías", icon: Tags },
  { label: "Estados", icon: GitBranch },
];

function SidebarSection({
  title,
  items,
}: {
  title: string;
  items: typeof navigation;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {title}
      </h2>
      <nav className="flex flex-col gap-1 px-3">
        {items.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <Icon aria-hidden="true" className="size-5" />
              <span>{item.label}</span>
            </>
          );

          if (item.to) {
            return (
              <Link
                key={item.label}
                to={item.to}
                activeProps={{
                  className:
                    "flex h-10 items-center gap-3 rounded-lg px-5 text-sm font-medium bg-slate-800 text-blue-400",
                }}
                inactiveProps={{
                  className:
                    "flex h-10 items-center gap-3 rounded-lg px-5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white",
                }}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={item.label}
              className="flex h-10 items-center gap-3 rounded-lg px-5 text-left text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              type="button"
            >
              {content}
            </button>
          );
        })}
      </nav>
    </section>
  );
}

export function AppSidebar() {
  const user = useAuthStore((state) => state.user);
  const displayName = user?.nombre ?? "Carlos Méndez";
  const role = user?.rol ?? "Admin";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 flex w-64 flex-col overflow-hidden border-r border-slate-800 bg-slate-950 text-white">
      <div className="flex h-[94px] items-center gap-3 border-b border-slate-800 px-5">
        <div className="flex size-12 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Shield aria-hidden="true" className="size-6" />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-base font-semibold leading-none">
            GestIncidencias
          </p>
          <p className="text-sm text-slate-500">Sistema v1.0</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-10 py-8">
        <SidebarSection title="Navegación" items={navigation} />
        <SidebarSection title="Configuración" items={configuration} />
      </div>

      <div className="flex h-[86px] items-center gap-3 border-t border-slate-800 px-5">
        <Avatar className="bg-slate-800" size="lg">
          <AvatarFallback className="bg-slate-800 text-sm font-semibold text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p className="text-sm text-slate-500">{role}</p>
        </div>
      </div>
    </aside>
  );
}
