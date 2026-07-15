import { ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"

interface PerfilDangerZoneProps {
  onAdministrarUsuarios: () => void
}

/**
 * RF-33 admin-only acknowledgement block. It does NOT offer a self-delete
 * button (change forbids deleting the authenticated administrator). Instead
 * it links to the user-management page where deletion of *other* users is
 * performed with explicit confirmation.
 */
export function PerfilDangerZone({
  onAdministrarUsuarios,
}: PerfilDangerZoneProps) {
  return (
    <section
      aria-labelledby="perfil-danger-zone-title"
      className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4"
    >
      <header className="flex items-center gap-2">
        <ShieldAlert
          aria-hidden="true"
          className="size-4 text-amber-700"
        />
        <h2
          id="perfil-danger-zone-title"
          className="text-sm font-semibold text-amber-900"
        >
          Zona de riesgo
        </h2>
      </header>

      <p className="text-xs leading-relaxed text-amber-900/80">
        Como administrador puedes dar de baja usuarios del sistema desde la
        pantalla de gestion de usuarios. La eliminacion es logica
        (<code className="rounded bg-amber-100 px-1">activo = false</code>) y
        siempre requiere confirmacion explicita. No puedes eliminarte a ti
        mismo.
      </p>

      <div className="flex">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="h-8 px-3"
          onClick={onAdministrarUsuarios}
        >
          Administrar usuarios
        </Button>
      </div>
    </section>
  )
}
