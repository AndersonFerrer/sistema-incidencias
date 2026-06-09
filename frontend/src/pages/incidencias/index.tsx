import { Plus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  IncidenciasFilters,
  type IncidenciasFiltrosValues,
} from "@/pages/incidencias/components/incidencias-filters"
import { IncidenciasTable } from "@/pages/incidencias/components/incidencias-table"
import { aplicativosService } from "@/services/aplicativos-service"
import { categoriasService } from "@/services/categorias-service"
import { estadosAprobacionService } from "@/services/estados-aprobacion-service"
import { estadosProcesoService } from "@/services/estados-proceso-service"
import { incidentsService } from "@/services/incidents-service"
import type { AplicativoCliente } from "@/types/aplicativos"
import type { Categoria } from "@/types/categorias"
import type { EstadoAprobacion } from "@/types/estados-aprobacion"
import type { EstadoProceso } from "@/types/estados-proceso"
import type { Incidencia } from "@/types/incidencias"

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

export function IncidenciasPage() {
  const [filtros, setFiltros] =
    useState<IncidenciasFiltrosValues>(FILTROS_INICIALES)
  const [page, setPage] = useState(0)

  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [estadosProceso, setEstadosProceso] = useState<EstadoProceso[]>([])
  const [estadosAprobacion, setEstadosAprobacion] = useState<EstadoAprobacion[]>(
    []
  )
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [aplicativos, setAplicativos] = useState<AplicativoCliente[]>([])

  useEffect(() => {
    let cancelled = false

    async function loadCatalogos() {
      try {
        const [
          procesoResponse,
          aprobacionResponse,
          categoriasResponse,
          aplicativosResponse,
        ] = await Promise.all([
          estadosProcesoService.listar(),
          estadosAprobacionService.listar(),
          categoriasService.listar(),
          aplicativosService.listar(),
        ])

        if (cancelled) return

        setEstadosProceso(procesoResponse)
        setEstadosAprobacion(aprobacionResponse)
        setCategorias(categoriasResponse)
        setAplicativos(aplicativosResponse)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los catálogos."
        )
      }
    }

    loadCatalogos()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadIncidencias() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await incidentsService.listar({
          texto: filtros.texto.trim() || undefined,
          estadoProcesoId: filtros.estadoProcesoId || undefined,
          estadoAprobacionId: filtros.estadoAprobacionId || undefined,
          categoriaId: filtros.categoriaId || undefined,
          clienteId: filtros.clienteId || undefined,
          prioridad: filtros.prioridad || undefined,
          desde: filtros.desde || undefined,
          hasta: filtros.hasta || undefined,
          page,
          size: PAGE_SIZE,
        })

        if (cancelled) return

        setIncidencias(response.contenido)
        setTotal(response.total)
      } catch (err) {
        if (cancelled) return
        setIncidencias([])
        setTotal(0)
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo obtener el listado de incidencias."
        )
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadIncidencias()

    return () => {
      cancelled = true
    }
  }, [filtros, page])

  const totalLabel = useMemo(() => {
    if (isLoading) return "Cargando incidencias..."
    if (error) return error
    return `${total} incidencias encontradas`
  }, [total, isLoading, error])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Incidencias
          </h1>
          <p className="text-sm text-slate-500">{totalLabel}</p>
        </div>
        <Button size="lg" className="h-10 px-4">
          <Plus data-icon="inline-start" />
          Nueva Incidencia
        </Button>
      </header>

      <Card className="rounded-lg bg-white p-6 shadow-sm">
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
        total={total}
        page={page}
        size={PAGE_SIZE}
        categorias={categorias}
        aplicativos={aplicativos}
        estadosAprobacion={estadosAprobacion}
        onPageChange={setPage}
      />

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner className="size-4" />
          Actualizando resultados...
        </div>
      ) : null}
    </div>
  )
}
