import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
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
import { useAuthStore } from "@/store/auth-store"

/**
 * Guard global: solo ADMINISTRADOR puede atravesar esta ruta. Si el rol no
 * coincide, lanza un `redirect` en `beforeLoad` → el navegador cae en /dashboard.
 * Sincronico (lee `useAuthStore.getState()` sin hook) para encajar en
 * la firma de `beforeLoad`. El auth-check global lo hace `PrivateRoute`
 * dentro de `AppLayout`; este guard es EXCLUSIVAMENTE por rol.
 */
function requireAdmin() {
  const rol = useAuthStore.getState().user?.rol
  if (rol !== "ADMINISTRADOR") {
    throw redirect({ to: "/dashboard" })
  }
}

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
  beforeLoad: requireAdmin,
  component: () => (
    <AppLayout>
      <ClientesPage />
    </AppLayout>
  ),
})

const categoriasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/categorias",
  beforeLoad: requireAdmin,
  component: () => (
    <AppLayout>
      <CategoriasPage />
    </AppLayout>
  ),
})

const usuariosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/usuarios",
  beforeLoad: requireAdmin,
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
  beforeLoad: requireAdmin,
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
