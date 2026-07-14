import { AlertTriangle } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

export function Usuario403() {
  return (
    <Alert variant="destructive">
      <AlertTriangle aria-hidden="true" />
      <AlertTitle>Acceso restringido</AlertTitle>
      <AlertDescription>
        No tienes permisos para acceder a esta sección.
      </AlertDescription>
    </Alert>
  )
}
