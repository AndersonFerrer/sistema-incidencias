import { AlertTriangle, X } from "lucide-react"

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type ReporteErrorAlertProps = {
  message: string
  onDismiss: () => void
}

/**
 * Superficie no bloqueante para errores de red / 5xx. Reutiliza el Alert
 * de shadcn con role="alert" para accesibilidad. No usamos una libreria
 * de toast (prohibido en el diseno §3.3). El ultimo reporte valido sigue
 * visible detras del aviso - el padre no limpia `reporte` cuando
 * recibe error.
 */
export function ReporteErrorAlert({ message, onDismiss }: ReporteErrorAlertProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangle aria-hidden="true" />
      <AlertTitle>No se pudo cargar el reporte</AlertTitle>
      <AlertDescription>
        {message}. Se mantiene el ultimo reporte valido en pantalla.
      </AlertDescription>
      <AlertAction>
        <Button
          aria-label="Cerrar aviso de error"
          onClick={onDismiss}
          size="icon-xs"
          variant="ghost"
        >
          <X aria-hidden="true" />
        </Button>
      </AlertAction>
    </Alert>
  )
}
