import {
  ArrowUpDown,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CategoriaDeleteDialog } from "@/pages/categorias/components/categoria-delete-dialog"
import { CategoriaEstadoBadge } from "@/pages/categorias/components/categoria-estado-badge"
import { CategoriaForm } from "@/pages/categorias/components/categoria-form"
import { aplicativosService } from "@/services/aplicativos-service"
import { categoriasService } from "@/services/categorias-service"
import type { AplicativoCliente } from "@/types/aplicativos"
import type { Categoria } from "@/types/categorias"

type Modal = "cerrado" | "nuevo" | "editar" | "eliminar"

export function CategoriasPage() {
  const [modal, setModal] = useState<Modal>("cerrado")
  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState<Categoria | null>(null)

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [aplicativos, setAplicativos] = useState<AplicativoCliente[]>([])

  const [busqueda, setBusqueda] = useState("")
  const [filtroAplicativo, setFiltroAplicativo] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const cargarDatos = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [categoriasResponse, aplicativosResponse] = await Promise.all([
        categoriasService.listar(),
        aplicativosService.listar(),
      ])
      setCategorias(categoriasResponse)
      setAplicativos(aplicativosResponse)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las categorías."
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void cargarDatos()
  }, [cargarDatos])

  const aplicativoById = useMemo(() => {
    const map = new Map<string, AplicativoCliente>()
    aplicativos.forEach((aplicativo) => {
      map.set(aplicativo.id, aplicativo)
    })
    return map
  }, [aplicativos])

  const categoriasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return categorias.filter((categoria) => {
      if (filtroAplicativo && categoria.aplicativoId !== filtroAplicativo) {
        return false
      }
      if (!termino) return true
      return (
        categoria.nombre.toLowerCase().includes(termino) ||
        (categoria.descripcion?.toLowerCase().includes(termino) ?? false)
      )
    })
  }, [categorias, busqueda, filtroAplicativo])

  const abrirNuevo = () => {
    setCategoriaSeleccionada(null)
    setFormError(null)
    setModal("nuevo")
  }

  const abrirEdicion = (categoria: Categoria) => {
    setCategoriaSeleccionada(categoria)
    setFormError(null)
    setModal("editar")
  }

  const abrirEliminar = (categoria: Categoria) => {
    setCategoriaSeleccionada(categoria)
    setDeleteError(null)
    setModal("eliminar")
  }

  const cerrarModal = () => {
    if (isSubmitting || isDeleting) return
    setModal("cerrado")
    setCategoriaSeleccionada(null)
    setFormError(null)
    setDeleteError(null)
  }

  const guardarCategoria = async (values: {
    aplicativoId: string
    nombre: string
    descripcion: string
    activo: boolean
  }) => {
    setIsSubmitting(true)
    setFormError(null)
    try {
      if (modal === "editar" && categoriaSeleccionada) {
        await categoriasService.actualizar(categoriaSeleccionada.id, {
          aplicativoId: values.aplicativoId,
          nombre: values.nombre,
          descripcion: values.descripcion || undefined,
          activo: values.activo,
        })
      } else {
        await categoriasService.crear({
          aplicativoId: values.aplicativoId,
          nombre: values.nombre,
          descripcion: values.descripcion || undefined,
          activo: values.activo,
        })
      }
      await cargarDatos()
      setModal("cerrado")
      setCategoriaSeleccionada(null)
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la categoría."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmarEliminar = async () => {
    if (!categoriaSeleccionada) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await categoriasService.eliminar(categoriaSeleccionada.id)
      await cargarDatos()
      setModal("cerrado")
      setCategoriaSeleccionada(null)
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar la categoría."
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const limpiarFiltros = () => {
    setBusqueda("")
    setFiltroAplicativo("")
  }

  const filtroAplicativoVacio = busqueda.trim() === "" && filtroAplicativo === ""

  const modalAbierto = modal !== "cerrado"

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Categorías
          </h1>
          <p className="text-sm text-slate-500">
            Clasifica las incidencias que reportan los aplicativos clientes.
          </p>
        </div>
        <Button size="lg" className="h-10 px-4" onClick={abrirNuevo}>
          <Plus data-icon="inline-start" />
          Nueva Categoría
        </Button>
      </header>

      <Card className="rounded-lg bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            />
            <Input
              type="search"
              placeholder="Buscar por nombre o descripción"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              className="h-10 pl-9"
            />
          </div>
          <select
            aria-label="Filtrar por cliente"
            value={filtroAplicativo}
            onChange={(event) => setFiltroAplicativo(event.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm text-slate-900 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Todos los clientes</option>
            {aplicativos.map((aplicativo) => (
              <option key={aplicativo.id} value={aplicativo.id}>
                {aplicativo.nombre}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={limpiarFiltros}
            disabled={filtroAplicativoVacio}
          >
            Limpiar
          </Button>
        </div>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner className="size-4" />
          Cargando categorías...
        </div>
      ) : categoriasFiltradas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
          {categorias.length === 0
            ? "Aún no hay categorías registradas."
            : "No se encontraron categorías con los filtros aplicados."}
        </div>
      ) : (
        <Card className="rounded-lg bg-white shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-12 px-7 text-sm font-medium text-slate-500">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
                    >
                      Nombre
                      <ArrowUpDown aria-hidden="true" className="size-3.5" />
                    </button>
                  </TableHead>
                  <TableHead className="h-12 text-sm font-medium text-slate-500">
                    Cliente
                  </TableHead>
                  <TableHead className="h-12 text-sm font-medium text-slate-500">
                    Descripción
                  </TableHead>
                  <TableHead className="h-12 text-sm font-medium text-slate-500">
                    Estado
                  </TableHead>
                  <TableHead className="h-12 w-32 px-7 text-right text-sm font-medium text-slate-500">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoriasFiltradas.map((categoria) => {
                  const aplicativo = categoria.aplicativoId
                    ? aplicativoById.get(categoria.aplicativoId)
                    : undefined

                  return (
                    <TableRow key={categoria.id}>
                      <TableCell className="px-7 font-semibold text-slate-950">
                        {categoria.nombre}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {aplicativo?.nombre ?? "Sin cliente"}
                      </TableCell>
                      <TableCell className="max-w-md text-slate-500">
                        {categoria.descripcion ? (
                          <span className="line-clamp-2">
                            {categoria.descripcion}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <CategoriaEstadoBadge activo={categoria.activo} />
                      </TableCell>
                      <TableCell className="px-7">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => abrirEdicion(categoria)}
                            aria-label={`Editar ${categoria.nombre}`}
                            className="text-slate-500 hover:text-slate-900"
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => abrirEliminar(categoria)}
                            aria-label={`Eliminar ${categoria.nombre}`}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={modalAbierto}
        onOpenChange={(open) => {
          if (!open) cerrarModal()
        }}
      >
        {modal === "eliminar" ? (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Eliminar categoría</DialogTitle>
              <DialogDescription>
                Confirma la eliminación de la categoría seleccionada.
              </DialogDescription>
            </DialogHeader>
            <CategoriaDeleteDialog
              categoria={categoriaSeleccionada}
              isDeleting={isDeleting}
              error={deleteError}
              onConfirm={confirmarEliminar}
              onCancel={cerrarModal}
            />
          </DialogContent>
        ) : (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {modal === "editar" ? "Editar categoría" : "Nueva categoría"}
              </DialogTitle>
              <DialogDescription>
                {modal === "editar"
                  ? "Modifica los datos de la categoría seleccionada."
                  : "Registra una nueva categoría asociada a un cliente."}
              </DialogDescription>
            </DialogHeader>
            <CategoriaForm
              key={
                modal === "editar" && categoriaSeleccionada
                  ? `editar-${categoriaSeleccionada.id}`
                  : "nuevo"
              }
              categoria={modal === "editar" ? categoriaSeleccionada : null}
              aplicativos={aplicativos}
              isSubmitting={isSubmitting}
              error={formError}
              onSubmit={guardarCategoria}
              onCancel={cerrarModal}
            />
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
