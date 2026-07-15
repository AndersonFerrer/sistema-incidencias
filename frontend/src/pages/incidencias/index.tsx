import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  IncidenciasFilters,
  type IncidenciasFiltrosValues,
} from "@/pages/incidencias/components/incidencias-filters"
import { IncidenciasHeader } from "@/pages/incidencias/components/incidencias-header"
import { IncidenciasPagination } from "@/pages/incidencias/components/incidencias-pagination"
import { IncidenciasTable } from "@/pages/incidencias/components/incidencias-table"
import { NuevaIncidenciaView } from "@/pages/incidencias/components/nueva-incidencia-view"
import { ConfirmarEliminarIncidenciaDialog } from "@/pages/incidencias/components/confirmar-eliminar-incidencia-dialog"
import { ApiError } from "@/lib/http"
import { aplicativosService } from "@/services/aplicativos-service"
import { categoriasService } from "@/services/categorias-service"
import { estadosAprobacionService } from "@/services/estados-aprobacion-service"
import { estadosProcesoService } from "@/services/estados-proceso-service"
import { incidentsService } from "@/services/incidents-service"
import { usuariosService } from "@/services/usuarios-service"
import { useAuthStore } from "@/store/auth-store"
import type { AplicativoCliente } from "@/types/aplicativos"
import type { Categoria } from "@/types/categorias"
import type { EstadoAprobacion } from "@/types/estados-aprobacion"
import type { EstadoProceso } from "@/types/estados-proceso"
import type { Incidencia } from "@/types/incidencias"
import type { Usuario } from "@/types/usuarios"

const FILTROS_INICIALES: IncidenciasFiltrosValues = {
  texto: "",
  estadoProcesoId: "",
  categoriaId: "",
  prioridad: "",
  clienteId: "",
  estadoAprobacionId: "",
  desde: "",
  hasta: "",
}

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

type Vista = "listado" | "nueva"

export function IncidenciasPage() {
  const [vista, setVista] = useState<Vista>("listado")

  const currentUser = useAuthStore((state) => state.user)
  const currentUserIsAdmin = useMemo(
    () => currentUser?.rol === "ADMINISTRADOR",
    [currentUser]
  )

  const [filtros, setFiltros] =
    useState<IncidenciasFiltrosValues>(FILTROS_INICIALES)
  const [debouncedTexto, setDebouncedTexto] = useState(filtros.texto)
  const [page, setPage] = useState(0)

  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [incidenciaAEliminar, setIncidenciaAEliminar] = useState<Incidencia | null>(null)
  const [isEliminando, setIsEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  const [estadosProceso, setEstadosProceso] = useState<EstadoProceso[]>([])
  const [estadosAprobacion, setEstadosAprobacion] = useState<EstadoAprobacion[]>(
    []
  )
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [aplicativos, setAplicativos] = useState<AplicativoCliente[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [isLoadingCatalogos, setIsLoadingCatalogos] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadCatalogos() {
      setIsLoadingCatalogos(true)

      const catalogPromises: Promise<unknown>[] = [
        estadosProcesoService.listar(),
        estadosAprobacionService.listar(),
        categoriasService.listar(),
        aplicativosService.listar(),
      ]
      if (currentUserIsAdmin) {
        catalogPromises.push(usuariosService.listar())
      }

      const [procesoR, aprobacionR, categoriasR, aplicativosR, usuariosR] =
        await Promise.allSettled(catalogPromises)

      if (cancelled) return

      if (procesoR.status === "fulfilled") {
        setEstadosProceso(procesoR.value as EstadoProceso[])
      }
      if (aprobacionR.status === "fulfilled") {
        setEstadosAprobacion(aprobacionR.value as EstadoAprobacion[])
      }
      if (categoriasR.status === "fulfilled") {
        setCategorias(categoriasR.value as Categoria[])
      }
      if (aplicativosR.status === "fulfilled") {
        setAplicativos(aplicativosR.value as AplicativoCliente[])
      }
      if (usuariosR && usuariosR.status === "fulfilled") {
        setUsuarios(usuariosR.value as Usuario[])
      }

      const results = [
        procesoR,
        aprobacionR,
        categoriasR,
        aplicativosR,
        ...(usuariosR ? [usuariosR] : []),
      ]
      const failedReasons = results
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map((r) => r.reason)

      if (failedReasons.length > 0) {
        const first = failedReasons[0]
        setError(
          first instanceof Error
            ? first.message
            : "No se pudieron cargar los catálogos."
        )
      }

      setIsLoadingCatalogos(false)
    }

    void loadCatalogos()

    return () => {
      cancelled = true
    }
  }, [currentUserIsAdmin])

  const recargarListado = useCallback(() => {
    setPage(0)
    setVista("listado")
  }, [])

  const handleEliminar = useCallback((incidencia: Incidencia) => {
    setIncidenciaAEliminar(incidencia)
    setErrorEliminar(null)
  }, [])

  const confirmarEliminar = useCallback(async () => {
    if (!incidenciaAEliminar) return
    setErrorEliminar(null)
    try {
      await incidentsService.eliminar(incidenciaAEliminar.id)
      setIncidenciaAEliminar(null)
      recargarListado()
    } catch (err) {
      // Re-throw so the dialog shows the inline error and stays open.
      throw err instanceof ApiError || err instanceof Error
        ? err
        : new Error("No se pudo eliminar la incidencia.")
    }
  }, [incidenciaAEliminar, recargarListado])

  // Debounce the search text so rapid keystrokes don't fire a fetch per char.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedTexto(filtros.texto)
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [filtros.texto])

  useEffect(() => {
    if (vista !== "listado") return

    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    incidentsService
      .listar(
        {
          texto: debouncedTexto.trim() || undefined,
          estadoProcesoId: filtros.estadoProcesoId || undefined,
          estadoAprobacionId: filtros.estadoAprobacionId || undefined,
          categoriaId: filtros.categoriaId || undefined,
          clienteId: filtros.clienteId || undefined,
          prioridad: filtros.prioridad || undefined,
          desde: filtros.desde || undefined,
          hasta: filtros.hasta || undefined,
          page,
          size: PAGE_SIZE,
        },
        controller.signal
      )
      .then((response) => {
        if (controller.signal.aborted) return
        setIncidencias(response.contenido)
        setTotal(response.total)
        setIsLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setIncidencias([])
        setTotal(0)
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo obtener el listado de incidencias."
        )
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [
    debouncedTexto,
    filtros.estadoProcesoId,
    filtros.estadoAprobacionId,
    filtros.categoriaId,
    filtros.prioridad,
    filtros.clienteId,
    filtros.desde,
    filtros.hasta,
    page,
    vista,
  ])

  if (vista === "nueva") {
    return (
      <NuevaIncidenciaView
        aplicativos={aplicativos}
        categorias={categorias}
        usuarios={usuarios}
        isLoadingCatalogos={isLoadingCatalogos}
        onBack={() => setVista("listado")}
        onCreated={recargarListado}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <IncidenciasHeader
        totalShown={total}
        onNueva={() => setVista("nueva")}
        loading={isLoading}
        errorMessage={error}
      />

      <Card className="rounded-lg bg-white p-3 shadow-sm">
        <IncidenciasFilters
          values={filtros}
          onChange={(values) => {
            setFiltros(values)
            setPage(0)
          }}
          estadosProceso={estadosProceso}
          categorias={categorias}
          aplicativos={aplicativos}
          estadosAprobacion={estadosAprobacion}
        />
      </Card>

      <IncidenciasTable
        incidencias={incidencias}
        categorias={categorias}
        aplicativos={aplicativos}
        estadosAprobacion={estadosAprobacion}
        estadosProceso={estadosProceso}
        usuarios={usuarios}
        currentUserIsAdmin={currentUserIsAdmin}
        onEliminar={handleEliminar}
      />

      <IncidenciasPagination
        page={page}
        limit={PAGE_SIZE}
        count={total}
        onPageChange={setPage}
      />

      {isLoading ? (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Spinner className="size-3.5" />
          Actualizando resultados...
        </div>
      ) : null}

      <ConfirmarEliminarIncidenciaDialog
        open={incidenciaAEliminar !== null}
        incidencia={
          incidenciaAEliminar
            ? { codigo: incidenciaAEliminar.codigo, titulo: incidenciaAEliminar.titulo }
            : null
        }
        onClose={() => {
          setIncidenciaAEliminar(null)
          setErrorEliminar(null)
        }}
        onConfirm={confirmarEliminar}
      />
    </div>
  )
}
