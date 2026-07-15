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
import { ConfiguracionPage } from "@/pages/configuracion"
import { DashboardPage } from "@/pages/dashboard"
import { IncidenciasPage } from "@/pages/incidencias"
import { IncidenciaDetallePage } from "@/pages/incidencias/detalle"
import { LoginPage } from "@/pages/login"
import { NotificacionesPage } from "@/pages/notificaciones"
import { PerfilPage } from "@/pages/perfil"
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

const perfilRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/perfil",
  component: () => (
    <AppLayout>
      <PerfilPage />
    </AppLayout>
  ),
})

const configuracionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/configuracion",
  component: () => (
    <AppLayout>
      <ConfiguracionPage />
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
  configuracionRoute,
  usuariosRoute,
  reportesRoute,
  notificacionesRoute,
  perfilRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
