import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router"

import { AppLayout } from "@/layout/app-layout"
import { AuthLayout } from "@/layout/auth-layout"
import { CategoriasPage } from "@/pages/categorias"
import { ClientesPage } from "@/pages/clientes"
import { DashboardPage } from "@/pages/dashboard"
import { IncidenciasPage } from "@/pages/incidencias"
import { IncidenciaDetallePage } from "@/pages/incidencias/detalle"
import { LoginPage } from "@/pages/login"
import { NotificacionesPage } from "@/pages/notificaciones"
import { ReportesPage } from "@/pages/reportes"
import { UsuariosPage } from "@/pages/usuarios"

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <AuthLayout>
      <LoginPage />
    </AuthLayout>
  ),
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: () => (
    <AppLayout>
      <DashboardPage />
    </AppLayout>
  ),
})

const incidenciasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/incidencias",
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
})

const incidenciasIndexRoute = createRoute({
  getParentRoute: () => incidenciasRoute,
  path: "/",
  component: () => <IncidenciasPage />,
})

const incidenciaDetalleRoute = createRoute({
  getParentRoute: () => incidenciasRoute,
  path: "/$id",
  component: () => <IncidenciaDetallePage />,
})

const clientesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/clientes",
  component: () => (
    <AppLayout>
      <ClientesPage />
    </AppLayout>
  ),
})

const categoriasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/categorias",
  component: () => (
    <AppLayout>
      <CategoriasPage />
    </AppLayout>
  ),
})

const usuariosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/usuarios",
  component: () => (
    <AppLayout>
      <UsuariosPage />
    </AppLayout>
  ),
})

const reportesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reportes",
  component: () => (
    <AppLayout>
      <ReportesPage />
    </AppLayout>
  ),
})

const notificacionesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notificaciones",
  component: () => (
    <AppLayout>
      <NotificacionesPage />
    </AppLayout>
  ),
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  dashboardRoute,
  incidenciasRoute.addChildren([
    incidenciasIndexRoute,
    incidenciaDetalleRoute,
  ]),
  clientesRoute,
  categoriasRoute,
  usuariosRoute,
  reportesRoute,
  notificacionesRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
