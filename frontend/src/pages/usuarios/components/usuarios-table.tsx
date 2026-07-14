import {
  KeyRound,
  Pencil,
  Power,
  PowerOff,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Usuario } from "@/types/usuarios"

interface UsuariosTableProps {
  usuarios: Usuario[]
  loading: boolean
  currentUserId: string
  currentUserIsAdmin: boolean
  onEdit: (u: Usuario) => void
  onChangePassword: (u: Usuario) => void
  onToggleActive: (u: Usuario) => void
}

const SELF_GUARD_TITLE =
  "No puedes desactivar tu propio usuario administrador"
const HEAD_CLASS =
  "h-9 text-xs font-medium uppercase tracking-wide text-slate-500"
const ICON_BUTTON_CLASS = "text-slate-500 hover:text-slate-900"

function getInitials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part.charAt(0).toUpperCase()).join("")
}

function rolBadgeVariant(
  codigo: string
): "default" | "secondary" | "outline" {
  if (codigo === "ADMINISTRADOR") return "default"
  if (codigo === "AGENTE") return "secondary"
  return "outline"
}

export function UsuariosTable({
  usuarios,
  loading,
  currentUserId,
  currentUserIsAdmin,
  onEdit,
  onChangePassword,
  onToggleActive,
}: UsuariosTableProps) {
  if (usuarios.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-500">
        {loading
          ? "Cargando usuarios..."
          : "No se encontraron usuarios con los filtros aplicados."}
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={`${HEAD_CLASS} px-4`}>Usuario</TableHead>
          <TableHead className={HEAD_CLASS}>Email</TableHead>
          <TableHead className={HEAD_CLASS}>Rol</TableHead>
          <TableHead className={HEAD_CLASS}>Cliente</TableHead>
          <TableHead className={HEAD_CLASS}>Estado</TableHead>
          <TableHead className={`${HEAD_CLASS} w-32 px-4 text-right`}>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {usuarios.map((usuario) => {
          const selfGuardDisabled =
            usuario.id === currentUserId &&
            currentUserIsAdmin &&
            usuario.activo
          const ToggleIcon = usuario.activo ? Power : PowerOff
          const toggleLabel = usuario.activo
            ? `Desactivar a ${usuario.nombre}`
            : `Activar a ${usuario.nombre}`

          return (
            <TableRow key={usuario.id}>
              <TableCell className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback>
                      {getInitials(usuario.nombre) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-slate-950">
                    {usuario.nombre}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-2 text-sm text-slate-600">
                {usuario.email}
              </TableCell>
              <TableCell className="py-2">
                <Badge variant={rolBadgeVariant(usuario.rol.codigo)}>
                  {usuario.rol.nombre}
                </Badge>
              </TableCell>
              <TableCell className="py-2 text-sm text-slate-400">—</TableCell>
              <TableCell className="py-2">
                <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                  <span
                    aria-hidden="true"
                    className={
                      usuario.activo
                        ? "inline-block size-1.5 rounded-full bg-emerald-500"
                        : "inline-block size-1.5 rounded-full bg-slate-400"
                    }
                  />
                  {usuario.activo ? "Activo" : "Inactivo"}
                </span>
              </TableCell>
              <TableCell className="px-4 py-2">
                <div className="flex items-center justify-end gap-0.5">
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => onEdit(usuario)}
                    aria-label={`Editar a ${usuario.nombre}`}
                    className={ICON_BUTTON_CLASS}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => onChangePassword(usuario)}
                    aria-label={`Cambiar contraseña de ${usuario.nombre}`}
                    className={ICON_BUTTON_CLASS}
                  >
                    <KeyRound aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => onToggleActive(usuario)}
                    disabled={selfGuardDisabled}
                    title={selfGuardDisabled ? SELF_GUARD_TITLE : undefined}
                    aria-label={toggleLabel}
                    aria-disabled={selfGuardDisabled || undefined}
                    className={
                      usuario.activo
                        ? "text-slate-500 hover:text-amber-600 disabled:text-slate-300"
                        : "text-slate-500 hover:text-emerald-600"
                    }
                  >
                    <ToggleIcon aria-hidden="true" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
