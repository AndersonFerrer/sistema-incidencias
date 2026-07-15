import { useCallback, useEffect, useRef, useState } from "react"

import { notificacionesService } from "@/services/notificaciones-service"

/**
 * Poll `GET /api/notificaciones/no-leidas/count` every `intervalMs` (default
 * 30 s) y pausa cuando `document.visibilityState === "hidden"`. Al volver a
 * la pestaña visible, dispara un fetch inmediato para reflejar el estado
 * real sin esperar al siguiente tick (RF-39 + design D1).
 *
 * Devuelve `count` (>= 0 cuando hay respuesta, `null` hasta el primer fetch),
 * `loading` durante el primer fetch y `refresh()` para forzar una consulta
 * externa (p. ej. cuando el usuario marca como leida desde el dropdown).
 */
export function useNotificationsPolling(intervalMs = 30_000) {
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const controllerRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchCount = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      const response = await notificacionesService.count(controller.signal)
      if (controller.signal.aborted) return
      setCount(response.total)
      setError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      // Silenciar AbortError (cancelaciones intencionales); propagar el resto
      // solo como mensaje para mostrar un fallback en UI si se requiere.
      if (err instanceof Error && err.name === "AbortError") return
      setError(err instanceof Error ? err.message : null)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    function clearTimer() {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    function schedule() {
      clearTimer()
      if (cancelled) return
      if (typeof document !== "undefined" && document.hidden) return
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        if (cancelled) return
        void fetchCount().finally(() => {
          if (cancelled) return
          schedule()
        })
      }, intervalMs)
    }

    function onVisibilityChange() {
      if (document.hidden) {
        clearTimer()
        return
      }
      // Regresa a visible: fetch inmediato + reanuda polling.
      void fetchCount()
      schedule()
    }

    // Fetch inicial.
    void fetchCount().finally(() => {
      if (cancelled) return
      schedule()
    })

    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      cancelled = true
      clearTimer()
      controllerRef.current?.abort()
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [fetchCount, intervalMs])

  return { count, loading, error, refresh: fetchCount }
}
