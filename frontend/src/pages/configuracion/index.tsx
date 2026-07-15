import { Link } from "@tanstack/react-router"
import { AlertTriangle, Briefcase, ChevronRight, GitBranch, Tags } from "lucide-react"
import { useEffect, useState } from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  CatalogTab,
  type CatalogColumn,
  type CatalogField,
  type CatalogService,
} from "@/pages/configuracion/components/catalog-tab"
import {
  aplicativosService,
  type CrearAplicativoInput,
} from "@/services/aplicativos-service"
import {
  categoriasService,
  type CategoriaInput,
} from "@/services/categorias-service"
import {
  estadosAprobacionService,
  type EstadoAprobacionInput,
} from "@/services/estados-aprobacion-service"
import {
  estadosProcesoService,
  type EstadoProcesoInput,
} from "@/services/estados-proceso-service"
import { useAuthStore } from "@/store/auth-store"
import type { AplicativoCliente } from "@/types/aplicativos"
import type { Categoria } from "@/types/categorias"
import type { EstadoAprobacion } from "@/types/estados-aprobacion"
import type { EstadoProceso } from "@/types/estados-proceso"

type TabId = "categorias" | "aplicativos" | "estados-proceso" | "estados-aprobacion"

const TABS: ReadonlyArray<{
  id: TabId
  label: string
  icon: typeof Tags
}> = [
  { id: "categorias", label: "Categorias", icon: Tags },
  { id: "aplicativos", label: "Aplicativos", icon: Briefcase },
  { id: "estados-proceso", label: "Estados Proceso", icon: GitBranch },
  { id: "estados-aprobacion", label: "Estados Aprobacion", icon: GitBranch },
]

const categoriaColumns: ReadonlyArray<CatalogColumn<Categoria>> = [
  { key: "nombre", label: "Nombre", render: (c) => c.nombre },
  {
    key: "descripcion",
    label: "Descripcion",
    render: (c) =>
      c.descripcion ? (
        <span className="line-clamp-1 text-slate-600">{c.descripcion}</span>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    key: "activo",
    label: "Estado",
    render: (c) =>
      c.activo ? (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          Activo
        </span>
      ) : (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          Inactivo
        </span>
      ),
  },
]

const categoriaFields: ReadonlyArray<CatalogField> = [
  {
    key: "aplicativoId",
    label: "Aplicativo",
    type: "select",
    required: true,
    options: [], // resolved lazily at render time
  },
  { key: "nombre", label: "Nombre", type: "text", required: true },
  { key: "descripcion", label: "Descripcion", type: "textarea" },
  { key: "activo", label: "Activo", type: "checkbox" },
]

const aplicativoColumns: ReadonlyArray<CatalogColumn<AplicativoCliente>> = [
  { key: "nombre", label: "Nombre", render: (a) => a.nombre },
  {
    key: "apiKey",
    label: "API key",
    render: (a) => (
      <code className="rounded bg-slate-100 px-1 font-mono text-[11px] text-slate-700">
        {a.apiKey ?? "—"}
      </code>
    ),
  },
  {
    key: "activo",
    label: "Estado",
    render: (a) =>
      a.activo ? (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          Activo
        </span>
      ) : (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          Inactivo
        </span>
      ),
  },
]

const aplicativoFields: ReadonlyArray<CatalogField> = [
  { key: "nombre", label: "Nombre", type: "text", required: true },
  { key: "activo", label: "Activo", type: "checkbox" },
]

const estadoProcesoColumns: ReadonlyArray<CatalogColumn<EstadoProceso>> = [
  { key: "clave", label: "Clave", render: (e) => <code className="font-mono text-xs">{e.clave}</code> },
  { key: "etiqueta", label: "Etiqueta", render: (e) => e.etiqueta },
  { key: "orden", label: "Orden", render: (e) => e.orden },
  {
    key: "esTerminal",
    label: "Terminal",
    render: (e) => (e.esTerminal ? "Si" : "No"),
  },
]

const estadoProcesoFields: ReadonlyArray<CatalogField> = [
  { key: "clave", label: "Clave", type: "text", required: true, placeholder: "EN_REVISION" },
  { key: "etiqueta", label: "Etiqueta", type: "text", required: true },
  { key: "orden", label: "Orden", type: "number", required: true },
  { key: "esTerminal", label: "Es terminal", type: "checkbox" },
  { key: "activo", label: "Activo", type: "checkbox" },
]

const estadoAprobacionColumns: ReadonlyArray<CatalogColumn<EstadoAprobacion>> = [
  { key: "clave", label: "Clave", render: (e) => <code className="font-mono text-xs">{e.clave}</code> },
  { key: "etiqueta", label: "Etiqueta", render: (e) => e.etiqueta },
]

const estadoAprobacionFields: ReadonlyArray<CatalogField> = [
  { key: "clave", label: "Clave", type: "text", required: true, placeholder: "EN_REVISION" },
  { key: "etiqueta", label: "Etiqueta", type: "text", required: true },
  { key: "activo", label: "Activo", type: "checkbox" },
]

const categoriaService: CatalogService<Categoria, CategoriaInput> = {
  listar: () => categoriasService.listar(),
  crear: (input) => categoriasService.crear(input),
  actualizar: (id, input) => categoriasService.actualizar(id, input),
  eliminar: (id) => categoriasService.eliminar(id),
}

const aplicativoService: CatalogService<
  AplicativoCliente,
  CrearAplicativoInput
> = {
  listar: () => aplicativosService.listar(),
  crear: (input) => aplicativosService.crear(input),
  actualizar: (id, input) => aplicativosService.actualizar(id, input),
  eliminar: (id) => aplicativosService.eliminar(id),
}

const estadoProcesoServiceAdapter: CatalogService<
  EstadoProceso,
  EstadoProcesoInput
> = {
  listar: () => estadosProcesoService.listar(),
  crear: (input) => estadosProcesoService.crear(input),
  actualizar: (id, input) => estadosProcesoService.actualizar(id, input),
  eliminar: (id) => estadosProcesoService.eliminar(id),
}

const estadoAprobacionServiceAdapter: CatalogService<
  EstadoAprobacion,
  EstadoAprobacionInput
> = {
  listar: () => estadosAprobacionService.listar(),
  crear: (input) => estadosAprobacionService.crear(input),
  actualizar: (id, input) => estadosAprobacionService.actualizar(id, input),
  eliminar: (id) => estadosAprobacionService.eliminar(id),
}

export function ConfiguracionPage() {
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.rol === "ADMINISTRADOR"

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-3" aria-live="polite">
        <header className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Configuracion
          </h1>
          <p className="text-xs text-slate-500">
            Catalogos y parametros del sistema.
          </p>
        </header>
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Acceso restringido</AlertTitle>
          <AlertDescription>
            Esta pagina solo esta disponible para administradores. Inicia
            sesion con un usuario administrador para gestion de catalogos.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-0.5">
        <nav
          aria-label="Ruta"
          className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-slate-500"
        >
          <Link to="/dashboard" className="hover:text-slate-900">
            Inicio
          </Link>
          <ChevronRight aria-hidden="true" className="size-3" />
          <span className="text-slate-700">Configuracion</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Configuracion
        </h1>
        <p className="text-xs text-slate-500">
          Administra catalogos, aplicativos cliente y estados del sistema.
        </p>
      </header>

      <Card className="rounded-lg bg-white shadow-sm">
        <CardContent className="p-0">
          <Tabs />
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Tabbed catalog management. Keeps its own active-tab state but defers
 * data + CRUD to the four `CatalogTab` instances. Each instance owns its
 * loader and form state — the page itself stays thin.
 */
function Tabs() {
  const [activeTab, setActiveTab] = useState<TabId>("categorias")

  return (
    <div className="flex flex-col">
      <div
        role="tablist"
        aria-label="Catalogos del sistema"
        className="flex flex-wrap gap-1 border-b border-slate-200 px-2 pt-2"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`configuracion-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`configuracion-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={
                selected
                  ? "flex h-8 items-center gap-2 rounded-t-md border-b-2 border-blue-600 px-3 text-sm font-medium text-blue-700"
                  : "flex h-8 items-center gap-2 rounded-t-md px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              }
            >
              <Icon aria-hidden="true" className="size-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`configuracion-panel-${activeTab}`}
        aria-labelledby={`configuracion-tab-${activeTab}`}
        className="p-5"
      >
        {activeTab === "categorias" ? (
          <CategoriasTab />
        ) : null}
        {activeTab === "aplicativos" ? (
          <AplicativosTab />
        ) : null}
        {activeTab === "estados-proceso" ? (
          <EstadosProcesoTab />
        ) : null}
        {activeTab === "estados-aprobacion" ? (
          <EstadosAprobacionTab />
        ) : null}
      </div>
    </div>
  )
}

function CategoriasTab() {
  const [aplicativos, setAplicativos] = useState<AplicativoCliente[]>([])
  const [loadingAux, setLoadingAux] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoadingAux(true)
    aplicativosService
      .listar(controller.signal)
      .then((payload) => {
        if (controller.signal.aborted) return
        setAplicativos(payload)
        setLoadingAux(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setLoadingAux(false)
      })
    return () => controller.abort()
  }, [])

  if (loadingAux) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Spinner className="size-3.5" />
        Cargando aplicativos...
      </div>
    )
  }

  const fieldsWithOptions: CatalogField[] = categoriaFields.map((f) =>
    f.key === "aplicativoId"
      ? {
          ...f,
          options: aplicativos.map((a) => ({ value: a.id, label: a.nombre })),
        }
      : f
  )

  return (
    <CatalogTab
      resourceName="Categoría"
      service={categoriaService}
      columns={categoriaColumns}
      fields={fieldsWithOptions}
      getId={(c) => c.id}
      getLabel={(c) => c.nombre}
      initialValues={() => ({
        aplicativoId: aplicativos[0]?.id ?? "",
        nombre: "",
        descripcion: "",
        activo: true,
      })}
      toInput={(values) => ({
        aplicativoId: String(values.aplicativoId ?? ""),
        nombre: String(values.nombre ?? "").trim(),
        descripcion: String(values.descripcion ?? "").trim() || undefined,
        activo: Boolean(values.activo),
      })}
      fromItem={(item) => ({
        aplicativoId: item.aplicativoId,
        nombre: item.nombre,
        descripcion: item.descripcion ?? "",
        activo: Boolean(item.activo),
      })}
    />
  )
}

function AplicativosTab() {
  return (
    <CatalogTab
      resourceName="Aplicativo"
      service={aplicativoService}
      columns={aplicativoColumns}
      fields={aplicativoFields}
      getId={(a) => a.id}
      getLabel={(a) => a.nombre}
      initialValues={() => ({ nombre: "", activo: true })}
      toInput={(values) => ({
        nombre: String(values.nombre ?? "").trim(),
        activo: Boolean(values.activo),
      })}
      fromItem={(item) => ({ nombre: item.nombre, activo: Boolean(item.activo) })}
    />
  )
}

function EstadosProcesoTab() {
  return (
    <CatalogTab
      resourceName="Estado de proceso"
      service={estadoProcesoServiceAdapter}
      columns={estadoProcesoColumns}
      fields={estadoProcesoFields}
      getId={(e) => e.id}
      getLabel={(e) => e.etiqueta}
      initialValues={() => ({
        clave: "",
        etiqueta: "",
        orden: 1,
        esTerminal: false,
        activo: true,
      })}
      toInput={(values) => ({
        clave: String(values.clave ?? "").trim().toUpperCase(),
        etiqueta: String(values.etiqueta ?? "").trim(),
        esTerminal: Boolean(values.esTerminal),
        orden: Number(values.orden ?? 1),
        activo: Boolean(values.activo),
      })}
      fromItem={(item) => ({
        clave: item.clave,
        etiqueta: item.etiqueta,
        orden: item.orden,
        esTerminal: Boolean(item.esTerminal),
        activo: Boolean(item.activo),
      })}
    />
  )
}

function EstadosAprobacionTab() {
  return (
    <CatalogTab
      resourceName="Estado de aprobación"
      service={estadoAprobacionServiceAdapter}
      columns={estadoAprobacionColumns}
      fields={estadoAprobacionFields}
      getId={(e) => e.id}
      getLabel={(e) => e.etiqueta}
      initialValues={() => ({ clave: "", etiqueta: "", activo: true })}
      toInput={(values) => ({
        clave: String(values.clave ?? "").trim().toUpperCase(),
        etiqueta: String(values.etiqueta ?? "").trim(),
        activo: Boolean(values.activo),
      })}
      fromItem={(item) => ({
        clave: item.clave,
        etiqueta: item.etiqueta,
        activo: Boolean(item.activo),
      })}
    />
  )
}