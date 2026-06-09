import { Plus, Search } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ClienteCard } from "@/pages/clientes/components/cliente-card"
import { ClienteForm } from "@/pages/clientes/components/cliente-form"
import { aplicativosService } from "@/services/aplicativos-service"
import { categoriasService } from "@/services/categorias-service"
import type { AplicativoCliente } from "@/types/aplicativos"
import type { Categoria } from "@/types/categorias"

type Modal = "cerrado" | "nuevo" | "editar"

export function ClientesPage() {
  const [modal, setModal] = useState<Modal>("cerrado")
  const [clienteEdit, setClienteEdit] = useState<AplicativoCliente | null>(null)

  const [aplicativos, setAplicativos] = useState<AplicativoCliente[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [busqueda, setBusqueda] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [rotatingId, setRotatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const cargarDatos = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [aplicativosResponse, categoriasResponse] = await Promise.all([
        aplicativosService.listar(),
        categoriasService.listar(),
      ])
      setAplicativos(aplicativosResponse)
      setCategorias(categoriasResponse)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los clientes."
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void cargarDatos()
  }, [cargarDatos])

  const aplicativosConConteo = useMemo(() => {
    return aplicativos.map((aplicativo) => {
      const categoriasDelCliente = categorias.filter(
        (categoria) => categoria.aplicativoId === aplicativo.id
      )
      return {
        ...aplicativo,
        categoriasCount: categoriasDelCliente.length,
      }
    })
  }, [aplicativos, categorias])

  const aplicativosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    if (!termino) return aplicativosConConteo
    return aplicativosConConteo.filter(
      (aplicativo) =>
        aplicativo.nombre.toLowerCase().includes(termino) ||
        (aplicativo.descripcion?.toLowerCase().includes(termino) ?? false)
    )
  }, [aplicativosConConteo, busqueda])

  const abrirNuevo = () => {
    setClienteEdit(null)
    setFormError(null)
    setModal("nuevo")
  }

  const abrirEdicion = (cliente: AplicativoCliente) => {
    setClienteEdit(cliente)
    setFormError(null)
    setModal("editar")
  }

  const cerrarModal = () => {
    if (isSubmitting) return
    setModal("cerrado")
    setClienteEdit(null)
    setFormError(null)
  }

  const guardarCliente = async (values: {
    nombre: string
    activo: boolean
  }) => {
    setIsSubmitting(true)
    setFormError(null)
    try {
      if (modal === "editar" && clienteEdit) {
        await aplicativosService.actualizar(clienteEdit.id, {
          nombre: values.nombre,
          activo: values.activo,
        })
      } else {
        await aplicativosService.crear({
          nombre: values.nombre,
          activo: values.activo,
        })
      }
      await cargarDatos()
      setModal("cerrado")
      setClienteEdit(null)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "No se pudo guardar el cliente."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const alternarActivo = async (cliente: AplicativoCliente) => {
    setTogglingId(cliente.id)
    setError(null)
    try {
      await aplicativosService.actualizar(cliente.id, {
        nombre: cliente.nombre,
        activo: !cliente.activo,
      })
      await cargarDatos()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cambiar el estado del cliente."
      )
    } finally {
      setTogglingId(null)
    }
  }

  const rotarApiKey = async (cliente: AplicativoCliente) => {
    setRotatingId(cliente.id)
    setError(null)
    try {
      await aplicativosService.rotarApiKey(cliente.id)
      await cargarDatos()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo rotar la API key."
      )
    } finally {
      setRotatingId(null)
    }
  }

  const eliminarCliente = async (cliente: AplicativoCliente) => {
    if (typeof window !== "undefined") {
      const confirmado = window.confirm(
        `¿Eliminar el cliente "${cliente.nombre}"? Esta acción no se puede deshacer.`
      )
      if (!confirmado) return
    }
    setDeletingId(cliente.id)
    setError(null)
    try {
      await aplicativosService.eliminar(cliente.id)
      await cargarDatos()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar el cliente."
      )
    } finally {
      setDeletingId(null)
    }
  }

  const modalAbierto = modal !== "cerrado"

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Clientes / Aplicaciones
          </h1>
          <p className="text-sm text-slate-500">
            Aplicaciones externas que reportan incidencias a este sistema
          </p>
        </div>
        <Button size="lg" className="h-10 px-4" onClick={abrirNuevo}>
          <Plus data-icon="inline-start" />
          Nuevo Cliente
        </Button>
      </header>

      <div className="relative max-w-xl">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
        />
        <Input
          type="search"
          placeholder="Buscar cliente..."
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          className="h-10 pl-9"
        />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner className="size-4" />
          Cargando clientes...
        </div>
      ) : aplicativosFiltrados.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
          {busqueda.trim()
            ? "No se encontraron clientes con ese criterio."
            : "Aún no hay clientes registrados."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {aplicativosFiltrados.map((cliente) => (
            <ClienteCard
              key={cliente.id}
              cliente={cliente}
              onEditar={abrirEdicion}
              onAlternarActivo={alternarActivo}
              onRotarApiKey={rotarApiKey}
              onEliminar={eliminarCliente}
              isToggling={togglingId === cliente.id}
              isRotating={rotatingId === cliente.id}
              isDeleting={deletingId === cliente.id}
            />
          ))}
        </div>
      )}

      <Dialog
        open={modalAbierto}
        onOpenChange={(open) => {
          if (!open) cerrarModal()
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {modal === "editar" ? "Editar cliente" : "Nuevo cliente"}
            </DialogTitle>
            <DialogDescription>
              {modal === "editar"
                ? "Modifica los datos del aplicativo cliente."
                : "Registra un nuevo aplicativo cliente en el sistema."}
            </DialogDescription>
          </DialogHeader>
          <ClienteForm
            key={
              modal === "editar" && clienteEdit
                ? `editar-${clienteEdit.id}`
                : "nuevo"
            }
            cliente={modal === "editar" ? clienteEdit : null}
            isSubmitting={isSubmitting}
            error={formError}
            onSubmit={guardarCliente}
            onCancel={cerrarModal}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
