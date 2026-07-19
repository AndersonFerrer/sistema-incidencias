import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { PrivateRoute } from "@/components/auth/private-route"
import { AppHeader } from "@/layout/app-header"
import { AppSidebar } from "@/layout/app-sidebar"

type AppLayoutProps = {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <PrivateRoute>
      <div className="min-h-svh bg-slate-50 text-slate-950">
        <AppSidebar />
        <AppHeader />
        <main className="fixed bottom-0 left-64 right-0 top-[70px] overflow-y-auto bg-slate-50">
          <div className="min-w-[1180px] px-6 py-4">
            {/* RF-46: breadcrumb automatico en todas las paginas privadas */}
            <PageBreadcrumb />
            {children}
          </div>
        </main>
      </div>
    </PrivateRoute>
  )
}
