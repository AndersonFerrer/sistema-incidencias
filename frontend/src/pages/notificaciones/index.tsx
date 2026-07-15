import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { CheckCheck, Inbox } from "lucide-react"

import { ApiError } from "@/lib/http"
import { useNotificationsPolling } from "@/hooks/use-notifications-polling"
import { notificacionesService } from "@/services/notificaciones-service"
import type { Notificacion } from "@/services/notificaciones-service"

import { NotificacionesTable } from "@/pages/notificaciones/components/notificaciones-table"
import {
  NotificacionesPagination,
} from "@/pages/notificaciones/components/notificaciones-pagination"

const PAGE_SIZE = 20

type Carga = "idle" | "loading" | "ready" | "error"

type FiltrosAplicados = {
  page: number
  size: number
  soloNoLeidas: boolean
}

/**
 * Pagina privada `/notificaciones` (RF-38, change `notificaciones-realtime`).
 *
 * Carga `GET /api/notificaciones?page&size&soloNoLeidas` al montar y refetch
 * cuando cambia el filtro o la pagina. El hook `useNotificationsPolling`
 * mantiene el conteo de no-leidas sincronizado con el badge del topbar.
 * Click en una fila con `incidenciaId`: marca como leida + navega al detalle.
 * Boton "Marcar todas como leidas" consume `POST /marcar-todas-leidas`.
 */
export function NotificacionesPage() {
  const navigate = useNavigate()

  const [filtros, setFiltros] = useState<FiltrosAplicados>({
    page: 0,
    size: PAGE_SIZE,
    soloNoLeidas: false,
  })
  const [items, setItems] = useState<Notificacion[]>([])
  const [total, setTotal] = useState(0)
  const [carga, setCarga] = useState<Carga>("loading")
  const [error, setError] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)

  const controllerRef = useRef<AbortController | null>(null)
  const { refresh: refreshCount } = useNotificationsPolling()

  const fetchList = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setCarga("loading")
    setError(null)
    try {
      const response = await notificacionesService.obtener(
        {
          page: filtros.page,
          size: filtros.size,
          soloNoLeidas: filtros.soloNoLeidas,
        },
        controller.signal
      )
      if (controller.signal.aborted) return
      setItems(response.contenido)
      setTotal(response.total)
      setCarga("ready")
    } catch (err) {
      if (controller.signal.aborted) return
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "No se pudieron cargar las notificaciones."
      )
      setCarga("error")
    }
  }, [filtros.page, filtros.size, filtros.soloNoLeidas])

  useEffect(() => {
    void fetchList()
    return () => controllerRef.current?.abort()
  }, [fetchList])

  const onMarcarLeida = useCallback(
    async (item: Notificacion) => {
      try {
        await notificacionesService.marcarLeida(item.id)
        // Marca optimista: actualiza fila in-place; refetch mantiene el orden.
        setItems((prev) =>
          prev.map((n) =>
            n.id === item.id
              ? { ...n, leido: true, leidoEn: new Date().toISOString() }
              : n
          )
        )
        setTotal((prev) => (filtros.soloNoLeidas ? Math.max(0, prev - 1) : prev))
        void refreshCount()
      } catch (err) {
        setError(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : "No se pudo marcar como leida."
        )
      }
    },
    [filtros.soloNoLeidas, refreshCount]
  )

  const onEliminar = useCallback(
    async (item: Notificacion) => {
      try {
        await notificacionesService.eliminar(item.id)
        setItems((prev) => prev.filter((n) => n.id !== item.id))
        setTotal((prev) => Math.max(0, prev - 1))
        void refreshCount()
      } catch (err) {
        setError(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : "No se pudo eliminar la notificacion."
        )
      }
    },
    [refreshCount]
  )

  const onClickFila = useCallback(
    async (item: Notificacion) => {
      if (item.incidenciaId) {
        if (!item.leido) await onMarcarLeida(item)
        void navigate({
          to: "/incidencias/$id",
          params: { id: item.incidenciaId },
        })
      } else if (!item.leido) {
        await onMarcarLeida(item)
      }
    },
    [navigate, onMarcarLeida]
  )

  const onMarcarTodas = useCallback(async () => {
    setBulkLoading(true)
    try {
      await notificacionesService.marcarTodas()
      // Si estamos filtrando por no-leidas, la lista se vacia; si no, marcamos
      // optimistamente cada fila visible y refetcheamos en background.
      if (filtros.soloNoLeidas) {
        setItems([])
        setTotal(0)
      } else {
        const ahora = new Date().toISOString()
        setItems((prev) =>
          prev.map((n) =>
            n.leido ? n : { ...n, leido: true, leidoEn: ahora }
          )
        )
      }
      void refreshCount()
      void fetchList()
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "No se pudieron marcar todas como leidas."
      )
    } finally {
      setBulkLoading(false)
    }
  }, [filtros.soloNoLeidas, refreshCount, fetchList])

  const onPageChange = useCallback((page: number) => {
    setFiltros((prev) => ({ ...prev, page }))
  }, [])

  const onToggleSoloNoLeidas = useCallback(() => {
    setFiltros((prev) => ({ ...prev, page: 0, soloNoLeidas: !prev.soloNoLeidas }))
  }, [])

  const mostrarSkeleton = carga === "loading" && items.length === 0

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-end justify-between gap-3">
        <section className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Notificaciones
          </h1>
          <p className="text-xs text-slate-500">
            Centro de notificaciones. Marca como leida o navega al incidente
            relacionado.
          </p>
        </section>
        <button
          type="button"
          onClick={onMarcarTodas}
          disabled={bulkLoading || items.every((n) => n.leido)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCheck aria-hidden="true" className="size-4" />
          {bulkLoading ? "Marcando..." : "Marcar todas"}
        </button>
      </header>

      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
          <input
            type="checkbox"
            checked={filtros.soloNoLeidas}
            onChange={onToggleSoloNoLeidas}
            className="size-3.5 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Solo no leidas
        </label>
        <span className="ml-auto text-[11px] text-slate-500">
          {total === 0
            ? carga === "loading"
              ? "Cargando..."
              : "Sin notificaciones"
            : `${total} en total`}
        </span>
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700 shadow-sm">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-700 transition-colors hover:bg-red-100"
          >
            Cerrar
          </button>
        </div>
      ) : null}

      {mostrarSkeleton ? (
        <div
          aria-busy={true}
          aria-live="polite"
          className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-white px-6 py-10 text-sm text-slate-500 shadow-sm"
        >
          <Inbox aria-hidden="true" className="size-4" />
          Cargando notificaciones...
        </div>
      ) : (
        <NotificacionesTable
          items={items}
          loading={carga === "loading"}
          onClickFila={onClickFila}
          onMarcarLeida={onMarcarLeida}
          onEliminar={onEliminar}
        />
      )}

      <NotificacionesPagination
        page={filtros.page}
        limit={filtros.size}
        count={total}
        onPageChange={onPageChange}
      />
    </div>
  )
}
