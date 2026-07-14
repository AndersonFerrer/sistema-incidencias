import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { PaginationCursor } from "@/pages/usuarios/types"

interface UsuariosPaginationProps {
  cursor: PaginationCursor
  itemsShown: number
  onPrev: () => void
  onNext: () => void
}

export function UsuariosPagination({
  cursor,
  itemsShown,
  onPrev,
  onNext,
}: UsuariosPaginationProps) {
  const start = itemsShown === 0 ? 0 : cursor.offset + 1
  const end = cursor.offset + itemsShown
  const hasPrev = cursor.offset > 0
  const hasNext = cursor.hasMore

  return (
    <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2">
      <span className="text-xs text-slate-500">
        {itemsShown === 0
          ? "Sin resultados"
          : `Mostrando ${start}–${end}`}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="Página anterior"
          aria-disabled={!hasPrev || undefined}
        >
          <ChevronLeft data-icon="inline-start" className="size-3.5" />
          Anterior
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onNext}
          disabled={!hasNext}
          aria-label="Página siguiente"
          aria-disabled={!hasNext || undefined}
        >
          Siguiente
          <ChevronRight data-icon="inline-end" className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
