import { FileSpreadsheet, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

type ReporteExportButtonsProps = {
  /** `false` deshabilita ambos botones y muestra spinner inline. */
  exporting: boolean
  onExportPdf: () => void
  onExportExcel: () => void
}

/**
 * Botones presentacionales PDF + Excel. Delegan el fetch al padre
 * (`onExport*`); aqui solo se maqueta UI y loading state.
 * Mismas reglas que la pagina `/incidencias`: el spinner reemplaza
 * al icono mientras dura la descarga, sin texto adicional para no
 * mover la geometria del toolbar.
 */
export function ReporteExportButtons({
  exporting,
  onExportPdf,
  onExportExcel,
}: ReporteExportButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        aria-label="Exportar reporte PDF"
        className="h-8 px-3"
        disabled={exporting}
        onClick={onExportPdf}
        type="button"
        variant="outline"
      >
        {exporting ? (
          <Spinner aria-hidden="true" className="mr-1.5 size-3" />
        ) : (
          <FileText aria-hidden="true" className="mr-1.5 size-3" />
        )}
        Exportar PDF
      </Button>
      <Button
        aria-label="Exportar reporte Excel"
        className="h-8 px-3"
        disabled={exporting}
        onClick={onExportExcel}
        type="button"
        variant="outline"
      >
        {exporting ? (
          <Spinner aria-hidden="true" className="mr-1.5 size-3" />
        ) : (
          <FileSpreadsheet aria-hidden="true" className="mr-1.5 size-3" />
        )}
        Exportar Excel
      </Button>
    </div>
  )
}
