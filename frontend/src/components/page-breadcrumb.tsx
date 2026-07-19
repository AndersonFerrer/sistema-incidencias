import { Link, useRouterState } from "@tanstack/react-router"
import { HomeIcon } from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { getRouteTitle } from "@/lib/route-meta"

/**
 * Breadcrumb de pagina (RF-46 del change "quick wins").
 *
 * Lee la ruta actual de TanStack Router y genera un trail
 * `Home > <titulo>` desde el mapa ROUTE_TITLES. Si `items` se pasa
 * explicitamente, lo usa en su lugar (caso dinamico como detalle de
 * incidencia donde el "ultimo eslabon" incluye el codigo INC-XXX).
 *
 * Por diseño NO muestra el id dinamico en el detalle (/incidencias/:id);
 * eso queda como follow-up — mostraria el codigo real de la incidencia.
 */
export function PageBreadcrumb({ items }: { items?: string[] } = {}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  const trail = items ?? ["Inicio", getRouteTitle(pathname)]

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {trail.map((label, idx) => {
          const isLast = idx === trail.length - 1
          return (
            <span key={`${label}-${idx}`} className="contents">
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="flex items-center gap-1.5 font-medium text-slate-900">
                    {idx === 0 ? (
                      <HomeIcon aria-hidden="true" className="size-3.5" />
                    ) : null}
                    {label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    {idx === 0 ? (
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-1.5 text-slate-500 transition-colors hover:text-slate-900"
                      >
                        <HomeIcon aria-hidden="true" className="size-3.5" />
                        Inicio
                      </Link>
                    ) : (
                      <Link
                        to={pathname}
                        className="text-slate-500 transition-colors hover:text-slate-900"
                      >
                        {label}
                      </Link>
                    )}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {isLast ? null : <BreadcrumbSeparator />}
            </span>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
