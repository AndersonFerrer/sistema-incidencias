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
import { LoginPage } from "@/pages/login"

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
      <IncidenciasPage />
    </AppLayout>
  ),
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

const routeTree = rootRoute.addChildren([
  loginRoute,
  dashboardRoute,
  incidenciasRoute,
  clientesRoute,
  categoriasRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
