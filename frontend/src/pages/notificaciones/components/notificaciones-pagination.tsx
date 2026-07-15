import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

interface NotificacionesPaginationProps {
  page: number
  limit: number
  count: number
  onPageChange: (page: number) => void
}

/**
 * Paginacion del centro de notificaciones (espejo del patron de
 * `incidencias-pagination.tsx`). No bloquea los botones en bordes: el backend
 * recorta silenciosamente a la ultima pagina con datos.
 */
export function NotificacionesPagination({
  page,
  limit,
  count,
  onPageChange,
}: NotificacionesPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(count / limit))
  const start = count === 0 ? 0 : page * limit + 1
  const end = Math.min(count, (page + 1) * limit)
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index)

  return (
    <div className="flex flex-col items-center justify-between gap-2 border-t px-5 py-3 text-xs text-slate-500 md:flex-row">
      <p>
        {count === 0
          ? "Sin resultados"
          : `Mostrando ${start}-${end} de ${count}`}
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          disabled={page === 0}
          onClick={() => onPageChange(Math.max(0, page - 1))}
          aria-label="Pagina anterior"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        {pageNumbers.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            className={
              pageNumber === page
                ? "flex size-7 items-center justify-center rounded-md bg-blue-600 text-xs font-semibold text-white"
                : "flex size-7 items-center justify-center rounded-md text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            }
          >
            {pageNumber + 1}
          </button>
        ))}
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          aria-label="Pagina siguiente"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
