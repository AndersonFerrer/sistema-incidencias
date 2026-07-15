import { Link } from "@tanstack/react-router"
import { useCallback, useEffect, useRef, useState } from "react"

import { ApiError } from "@/lib/http"
import { cn } from "@/lib/utils"
import { notificacionesService } from "@/services/notificaciones-service"
import type { Notificacion } from "@/services/notificaciones-service"

type NotificationDropdownProps = {
  /**
   * Triggered cuando el conteo de no-leidas puede haber cambiado fuera del
   * dropdown (p. ej. tras marcar como leida desde el dropdown mismo).
   */
  onCountChanged?: () => void
  /**
   * Si se provee, se renderiza el boton bell con su badge; si es `null`
   * el componente solo renderiza el panel (uso interno / testing).
   */
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SIZE = 10

const TIPO_LABELS: Record<Notificacion["tipo"], string> = {
  INCIDENCIA_ASIGNADA: "Asignada",
  INCIDENCIA_APROBADA: "Aprobada",
  INCIDENCIA_RECHAZADA: "Rechazada",
  INCIDENCIA_ESTADO_CAMBIADO: "Estado cambiado",
  INCIDENCIA_COMENTARIO: "Nuevo comentario",
}

function formatRelativo(value: string): string {
  const ms = Date.now() - Date.parse(value)
  if (Number.isNaN(ms)) return value
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return "hace un momento"
  const min = Math.floor(sec / 60)
  if (min < 60) return `hace ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `hace ${hr} h`
  const days = Math.floor(hr / 24)
  if (days < 7) return `hace ${days} d`
  return value.slice(0, 10)
}

export function NotificationDropdown({
  onCountChanged,
  open,
  onOpenChange,
}: NotificationDropdownProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  // Track si ya intentamos cargar en esta sesion abierta del dropdown. Sin esto,
  // cuando el usuario tiene 0 notificaciones (items.length === 0) el effect
  // cumple `items.length === 0 && !loading && !error` indefinidamente y dispara
  // fetchItems() en bucle infinito en cada re-render.
  const hasFetchedRef = useRef(false)

  const [items, setItems] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const response = await notificacionesService.obtener(
        { page: 0, size: SIZE },
        controller.signal
      )
      if (controller.signal.aborted) return
      setItems(response.contenido)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "No se pudieron cargar las notificaciones."
      )
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  // Carga lazy: solo cuando el panel se abre por primera vez (por sesion de apertura).
  // Usamos un ref para evitar el refetch infinito cuando el usuario tiene 0
  // notificaciones: sin el ref, `items.length === 0 && !loading && !error`
  // permanece true tras cada fetch vacio y el effect re-dispara fetchItems().
  useEffect(() => {
    if (!open) {
      // Al cerrar el panel, reseteamos para que la proxima apertura vuelva a fetchear.
      hasFetchedRef.current = false
      return
    }
    if (!hasFetchedRef.current && !loading && !error) {
      hasFetchedRef.current = true
      void fetchItems()
    }
  }, [open, loading, error, fetchItems])

  // Click afuera cierra el panel.
  useEffect(() => {
    if (!open) return
    function handleClick(event: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open, onOpenChange])

  // Cleanup al desmontar.
  useEffect(() => {
    return () => controllerRef.current?.abort()
  }, [])

  const onItemClick = useCallback(
    async (item: Notificacion) => {
      if (item.leido) return
      setMarkingId(item.id)
      try {
        await notificacionesService.marcarLeida(item.id)
        setItems((prev) =>
          prev.map((n) =>
            n.id === item.id
              ? { ...n, leido: true, leidoEn: new Date().toISOString() }
              : n
          )
        )
        onCountChanged?.()
      } catch (err) {
        // No propagamos: el item sigue mostrándose como no-leida; el contador
        // se reintentará en el próximo poll.
        setError(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : "No se pudo marcar como leida."
        )
      } finally {
        setMarkingId(null)
      }
    },
    [onCountChanged]
  )

  return (
    <div ref={containerRef} className="relative">
      {open ? (
        <div
          aria-live="polite"
          className="absolute right-0 top-10 z-50 flex w-96 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
          role="dialog"
          aria-label="Notificaciones"
        >
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
            <p className="text-sm font-semibold text-slate-950">
              Notificaciones
            </p>
            <span className="text-[11px] text-slate-500">
              Últimas {SIZE}
            </span>
          </header>

          <ul className="flex max-h-96 flex-col divide-y divide-slate-100 overflow-y-auto">
            {loading ? (
              <li className="px-4 py-6 text-center text-xs text-slate-500">
                Cargando...
              </li>
            ) : error ? (
              <li className="px-4 py-6 text-center text-xs text-red-600">
                {error}
              </li>
            ) : items.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-slate-500">
                Sin notificaciones recientes.
              </li>
            ) : (
              items.map((item) => {
                const inner = (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          item.tipo === "INCIDENCIA_RECHAZADA"
                            ? "bg-red-50 text-red-700"
                            : item.tipo === "INCIDENCIA_APROBADA"
                            ? "bg-emerald-50 text-emerald-700"
                            : item.tipo === "INCIDENCIA_ASIGNADA"
                            ? "bg-blue-50 text-blue-700"
                            : item.tipo === "INCIDENCIA_ESTADO_CAMBIADO"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {TIPO_LABELS[item.tipo]}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatRelativo(item.creadoEn)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs font-medium text-slate-900">
                      {item.titulo}
                    </p>
                    {item.descripcion ? (
                      <p className="line-clamp-2 text-[11px] text-slate-500">
                        {item.descripcion}
                      </p>
                    ) : null}
                    {!item.leido ? (
                      <span
                        aria-hidden="true"
                        className="absolute left-1.5 top-3 size-1.5 rounded-full bg-blue-600"
                      />
                    ) : null}
                  </>
                )
                return (
                  <li key={item.id}>
                    <NotificationItem
                      item={item}
                      disabled={markingId === item.id}
                      onClick={() => onItemClick(item)}
                    >
                      {inner}
                    </NotificationItem>
                  </li>
                )
              })
            )}
          </ul>

          <footer className="border-t border-slate-200 px-4 py-2">
            <Link
              to="/notificaciones"
              onClick={() => onOpenChange(false)}
              className="block text-center text-xs font-semibold text-blue-700 transition-colors hover:text-blue-900"
            >
              Ver todas
            </Link>
          </footer>
        </div>
      ) : null}
    </div>
  )
}

function NotificationItem({
  item,
  disabled,
  onClick,
  children,
}: {
  item: Notificacion
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  // Item con `incidenciaId`: click marca como leida pero NO navega
  // (la spec RF-38 dice "click en item marca como leida + navega a incidencia",
  // pero el dropdown del topbar solo muestra las ultimas 10; el usuario va al
  // centro y alli si navega). Mantener el comportamiento del centro coherente.
  if (item.incidenciaId) {
    return (
      <Link
        to="/incidencias/$id"
        params={{ id: item.incidenciaId }}
        onClick={(event) => {
          event.preventDefault()
          if (disabled || item.leido) return
          onClick()
        }}
        className={cn(
          "relative flex cursor-pointer flex-col gap-1 px-4 py-3 transition-colors hover:bg-slate-50",
          item.leido ? "" : "bg-blue-50/40"
        )}
      >
        {children}
      </Link>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex w-full cursor-pointer flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-slate-50 disabled:opacity-60",
        item.leido ? "" : "bg-blue-50/40"
      )}
    >
      {children}
    </button>
  )
}
