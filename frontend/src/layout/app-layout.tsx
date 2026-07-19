import { useEffect, useState } from "react"

import { PrivateRoute } from "@/components/auth/private-route"
import { AppHeader } from "@/layout/app-header"
import { AppSidebar } from "@/layout/app-sidebar"

type AppLayoutProps = {
  children: React.ReactNode
}

/** Breakpoint alineado con Tailwind `md` (768px).
 *  - En desktop (>=md): el sidebar participa del layout (w-64 / w-16 segun open).
 *  - En mobile (<md):  el sidebar es overlay (translate-x). El main ocupa todo el ancho. */
const MD_BREAKPOINT = 768

export function AppLayout({ children }: AppLayoutProps) {
  // Estado unico del sidebar. En desktop es docked y abierto/cerrado togglea ancho.
  // En mobile es drawer y abierto/cerrado togglea visibilidad.
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true
    return window.matchMedia(`(min-width: ${MD_BREAKPOINT}px)`).matches
  })

  // Sincroniza con el tamano de ventana. Si el browser rota o redimensiona
  // cruzando el breakpoint, forza el sidebar al estado esperado para esa franja
  // (abierto en desktop, cerrado en mobile) para evitar un drawer overlay
  // "pegado" en desktop o un sidebar colapsado a 16px cuando se rota a mobile.
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MD_BREAKPOINT}px)`)
    const handler = () => {
      setSidebarOpen(mq.matches)
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  return (
    <PrivateRoute>
      <div className="min-h-svh bg-slate-50 text-slate-950">
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {/* Overlay backdrop solo en mobile cuando el drawer esta abierto. Cierra al click/tap. */}
        <SidebarBackdrop open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <AppHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
        <MainContent sidebarOpen={sidebarOpen}>{children}</MainContent>
      </div>
    </PrivateRoute>
  )
}

/**
 * Overlay semi-transparente que cierra el drawer al click. Solo se monta
 * en mobile cuando el sidebar esta abierto.
 */
function SidebarBackdrop({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <button
      type="button"
      aria-label="Cerrar menu"
      onClick={onClose}
      // `md:hidden` lo oculta en desktop. Si open=false, lo desmontamos
      // entero (`hidden`) para que no tape clicks ni aparezca en a11y tree.
      className={`fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm md:hidden ${
        open ? "" : "hidden"
      }`}
    />
  )
}

/**
 * Contenido principal. El offset-left sigue al sidebar:
 * - Mobile: left-0 (sidebar es overlay, no participa del layout).
 * - Desktop sidebar abierto:  md:left-64.
 * - Desktop sidebar colapsado: md:left-16.
 */
function MainContent({
  sidebarOpen,
  children,
}: {
  sidebarOpen: boolean
  children: React.ReactNode
}) {
  return (
    <main
      className={`fixed bottom-0 right-0 top-[60px] left-0 ${
        sidebarOpen ? "md:left-64" : "md:left-16"
      } overflow-y-auto bg-slate-50 transition-[left] duration-200 ease-in-out`}
    >
      <div className="w-full max-w-full px-4 py-4 md:px-6">{children}</div>
    </main>
  )
}
