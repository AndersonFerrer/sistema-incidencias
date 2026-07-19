/**
 * Mapa compartido de rutas a titulos legibles para humanos. Usado por:
 * - app-header.tsx (muestra el titulo de la pagina actual junto al icono lateral)
 * - components/page-breadcrumb.tsx (genera el trail "Home > Seccion")
 *
 * Centralizar este mapa evita duplicacion entre header y breadcrumb.
 */
export const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/incidencias": "Incidencias",
  "/clientes": "Clientes",
  "/categorias": "Categorias",
  "/configuracion": "Configuracion",
  "/usuarios": "Usuarios",
  "/reportes": "Reportes",
  "/notificaciones": "Notificaciones",
  "/perfil": "Mi perfil",
}

export function getRouteTitle(pathname: string): string {
  // Handle detalle /incidencias/:id sin hardcodear el id.
  if (pathname.startsWith("/incidencias/")) {
    return "Detalle de incidencia"
  }
  return ROUTE_TITLES[pathname] ?? "Sin titulo"
}
