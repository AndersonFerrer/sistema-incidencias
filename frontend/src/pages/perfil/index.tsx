import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { AlertTriangle, ChevronRight, KeyRound, ShieldAlert, UserCircle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ApiError } from "@/lib/http"
import { usuariosService } from "@/services/usuarios-service"
import { useAuthStore } from "@/store/auth-store"
import type { Usuario } from "@/types/usuarios"

import { CambiarPasswordForm } from "./components/cambiar-password-form"
import { PerfilDangerZone } from "./components/perfil-danger-zone"
import { PerfilInfoForm } from "./components/perfil-info-form"

type TabId = "info" | "password" | "danger-zone"

const TABS: ReadonlyArray<{
  id: TabId
  label: string
  icon: typeof UserCircle
  adminOnly: boolean
}> = [
  { id: "info", label: "Mi informacion", icon: UserCircle, adminOnly: false },
  {
    id: "password",
    label: "Cambiar contrasena",
    icon: KeyRound,
    adminOnly: false,
  },
  {
    id: "danger-zone",
    label: "Zona de riesgo",
    icon: ShieldAlert,
    adminOnly: true,
  },
]

type LoadState = "loading" | "ready" | "error"

export function PerfilPage() {
  const navigate = useNavigate()
  const syncProfile = useAuthStore((state) => state.syncProfile)
  const currentUser = useAuthStore((state) => state.user)
  const isAdmin = currentUser?.rol === "ADMINISTRADOR"

  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [state, setState] = useState<LoadState>("loading")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>("info")

  useEffect(() => {
    const controller = new AbortController()
    setState("loading")
    setErrorMsg(null)
    usuariosService
      .obtenerMiPerfil(controller.signal)
      .then((payload) => {
        if (controller.signal.aborted) return
        setUsuario(payload)
        setState("ready")
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setErrorMsg(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : "No se pudo cargar tu perfil."
        )
        setState("error")
      })
    return () => controller.abort()
  }, [])

  const handleInfoSubmit = useCallback(
    async (input: { nombre: string; avatarUrl: string | null }) => {
      const updated = await usuariosService.actualizarMiPerfil({
        nombre: input.nombre,
        avatarUrl: input.avatarUrl,
      })
      setUsuario(updated)
      syncProfile({
        nombre: updated.nombre,
        email: updated.email,
        avatarUrl: updated.avatarUrl ?? null,
      })
    },
    [syncProfile]
  )

  const handlePasswordSubmit = useCallback(
    async (input: { currentPassword: string; newPassword: string }) => {
      await usuariosService.cambiarMiPassword(input)
    },
    []
  )

  const handleAdministrarUsuarios = useCallback(() => {
    void navigate({ to: "/usuarios" })
  }, [navigate])

  const visibleTabs = useMemo(
    () => TABS.filter((tab) => isAdmin || !tab.adminOnly),
    [isAdmin]
  )

  if (state === "loading") {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <header className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Mi perfil
          </h1>
          <p className="text-xs text-slate-500">
            Consulta y actualiza tu informacion personal.
          </p>
        </header>
        <Card className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner className="size-4" />
            Cargando tu perfil...
          </div>
        </Card>
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="flex flex-col gap-3">
        <header className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Mi perfil
          </h1>
          <p className="text-xs text-slate-500">
            Consulta y actualiza tu informacion personal.
          </p>
        </header>
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>No se pudo cargar tu perfil</AlertTitle>
          <AlertDescription>{errorMsg ?? "Error desconocido."}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!usuario) return null

  const activeTabDef = visibleTabs.find((tab) => tab.id === activeTab)

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-0.5">
        <nav
          aria-label="Ruta"
          className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-slate-500"
        >
          <Link to="/dashboard" className="hover:text-slate-900">
            Inicio
          </Link>
          <ChevronRight aria-hidden="true" className="size-3" />
          <span className="text-slate-700">Mi perfil</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Mi perfil
        </h1>
        <p className="text-xs text-slate-500">
          Estos datos se muestran en todas las pantallas que muestran al
          usuario actual.
        </p>
      </header>

      <Card className="rounded-lg bg-white shadow-sm">
        <CardContent className="p-0">
          <div
            role="tablist"
            aria-label="Secciones del perfil"
            className="flex flex-wrap gap-1 border-b border-slate-200 px-2 pt-2"
          >
            {visibleTabs.map((tab) => {
              const Icon = tab.icon
              const selected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`perfil-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`perfil-panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    selected
                      ? "flex h-8 items-center gap-2 rounded-t-md border-b-2 border-blue-600 px-3 text-sm font-medium text-blue-700"
                      : "flex h-8 items-center gap-2 rounded-t-md px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  }
                >
                  <Icon aria-hidden="true" className="size-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div
            role="tabpanel"
            id={`perfil-panel-${activeTab}`}
            aria-labelledby={`perfil-tab-${activeTab}`}
            className="p-5"
          >
            {activeTabDef?.id === "info" ? (
              <PerfilInfoForm
                key={`info-${usuario.id}`}
                usuario={usuario}
                onSubmit={handleInfoSubmit}
              />
            ) : null}

            {activeTabDef?.id === "password" ? (
              <CambiarPasswordForm onSubmit={handlePasswordSubmit} />
            ) : null}

            {activeTabDef?.id === "danger-zone" && isAdmin ? (
              <PerfilDangerZone
                onAdministrarUsuarios={handleAdministrarUsuarios}
              />
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}