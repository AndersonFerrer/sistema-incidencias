import { ArrowLeft, Paperclip, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { incidentsService } from "@/services/incidents-service";
import type { AplicativoCliente } from "@/types/aplicativos";
import type { Categoria } from "@/types/categorias";
import type { Prioridad } from "@/types/incidencias";
import type { Usuario } from "@/types/usuarios";

type NuevaIncidenciaViewProps = {
  aplicativos: AplicativoCliente[];
  categorias: Categoria[];
  usuarios: Usuario[];
  isLoadingCatalogos: boolean;
  onBack: () => void;
  onCreated: () => void;
};

const PRIORIDADES: { value: Prioridad; label: string }[] = [
  { value: "BAJA", label: "Baja" },
  { value: "MEDIA", label: "Media" },
  { value: "ALTA", label: "Alta" },
  { value: "CRITICA", label: "Crítica" },
];

const AGENT_ROLE_CODES = ["AGENTE", "ADMINISTRADOR"];

type FormState = {
  titulo: string;
  descripcion: string;
  clienteId: string;
  categoriaId: string;
  prioridad: Prioridad;
  asignadoA: string;
};

const FORM_INICIAL: FormState = {
  titulo: "",
  descripcion: "",
  clienteId: "",
  categoriaId: "",
  prioridad: "MEDIA",
  asignadoA: "",
};

export function NuevaIncidenciaView({
  aplicativos,
  categorias,
  usuarios,
  isLoadingCatalogos,
  onBack,
  onCreated,
}: NuevaIncidenciaViewProps) {
  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const categoriasDelCliente = useMemo(() => {
    if (!form.clienteId) return [];
    return categorias.filter(
      (categoria) =>
        categoria.activo &&
        (categoria.aplicativoId
          ? categoria.aplicativoId === form.clienteId
          : true),
    );
  }, [categorias, form.clienteId]);

  useEffect(() => {
    if (
      form.categoriaId &&
      !categoriasDelCliente.some(
        (categoria) => categoria.id === form.categoriaId,
      )
    ) {
      setField("categoriaId", "");
    }
  }, [categoriasDelCliente, form.categoriaId]);

  const usuariosAsignables = useMemo(
    () =>
      usuarios
        .filter((usuario) => usuario.activo)
        .filter((usuario) =>
          AGENT_ROLE_CODES.includes(usuario.rol?.codigo ?? ""),
        ),
    [usuarios],
  );

  const handleArchivos = (event: React.ChangeEvent<HTMLInputElement>) => {
    const list = event.target.files;

    if (!list || list.length === 0) return;

    event.target.value = "";
  };

  const removerArchivo = (index: number) => {
    setArchivos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const puedeEnviar =
    form.titulo.trim().length > 0 &&
    form.descripcion.trim().length > 0 &&
    form.clienteId.length > 0 &&
    form.categoriaId.length > 0 &&
    !isSubmitting;

  const enviar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSubmitting(true);
    setError(null);

    try {
      await incidentsService.crear({
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        clienteId: form.clienteId,
        categoriaId: form.categoriaId,
        prioridad: form.prioridad,
        asignadoA: form.asignadoA || undefined,
        archivos: archivos.length > 0 ? archivos : undefined,
      });
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear la incidencia.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Volver al listado
        </button>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Nueva Incidencia
          </h1>
          <p className="text-xs text-slate-500">
            Completa los datos para registrar una nueva incidencia en el
            sistema.
          </p>
        </div>
      </header>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error al crear la incidencia</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={enviar} className="flex flex-col gap-3">
        <Card className="rounded-lg bg-white shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="incidencia-titulo"
                className="text-sm font-medium text-slate-700"
              >
                Título
              </label>
              <Input
                id="incidencia-titulo"
                value={form.titulo}
                onChange={(event) => setField("titulo", event.target.value)}
                placeholder="Ej. No carga el sistema de ventas"
                maxLength={200}
                required
                className="h-9"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="incidencia-descripcion"
                className="text-sm font-medium text-slate-700"
              >
                Descripción
              </label>
              <textarea
                id="incidencia-descripcion"
                value={form.descripcion}
                onChange={(event) =>
                  setField("descripcion", event.target.value)
                }
                placeholder="Detalla el problema, pasos para reproducirlo y el impacto observado."
                rows={4}
                required
                className="w-full resize-y rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm leading-snug outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white shadow-sm">
          <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="incidencia-cliente"
                className="text-sm font-medium text-slate-700"
              >
                Cliente / aplicativo
              </label>
              <select
                id="incidencia-cliente"
                value={form.clienteId}
                onChange={(event) => setField("clienteId", event.target.value)}
                required
                disabled={isLoadingCatalogos}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-slate-900 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">Selecciona un cliente</option>
                {aplicativos
                  .filter((aplicativo) => aplicativo.activo)
                  .map((aplicativo) => (
                    <option key={aplicativo.id} value={aplicativo.id}>
                      {aplicativo.nombre}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="incidencia-categoria"
                className="text-sm font-medium text-slate-700"
              >
                Categoría
              </label>
              <select
                id="incidencia-categoria"
                value={form.categoriaId}
                onChange={(event) =>
                  setField("categoriaId", event.target.value)
                }
                required
                disabled={!form.clienteId}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-slate-900 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">
                  {form.clienteId
                    ? "Selecciona una categoría"
                    : "Selecciona primero un cliente"}
                </option>
                {categoriasDelCliente.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
              {form.clienteId &&
              categoriasDelCliente.length === 0 &&
              !isLoadingCatalogos ? (
                <p className="text-xs text-slate-500">
                  Este cliente no tiene categorías registradas.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="incidencia-prioridad"
                className="text-sm font-medium text-slate-700"
              >
                Prioridad
              </label>
              <select
                id="incidencia-prioridad"
                value={form.prioridad}
                onChange={(event) =>
                  setField("prioridad", event.target.value as Prioridad)
                }
                required
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-slate-900 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {PRIORIDADES.map((prioridad) => (
                  <option key={prioridad.value} value={prioridad.value}>
                    {prioridad.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="incidencia-asignado"
                className="text-sm font-medium text-slate-700"
              >
                Asignado a
                <span className="ml-1 text-xs font-normal text-slate-400">
                  (opcional)
                </span>
              </label>
              <select
                id="incidencia-asignado"
                value={form.asignadoA}
                onChange={(event) => setField("asignadoA", event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-slate-900 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Sin asignar</option>
                {usuariosAsignables.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.nombre} — {usuario.rol.nombre}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white shadow-sm">
          <CardContent className="flex flex-col gap-2.5 p-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-slate-700">
                Archivos adjuntos
              </span>
              <span className="text-xs text-slate-500">
                Puedes adjuntar varias imágenes o documentos que respalden la
                incidencia.
              </span>
            </div>

            <label
              htmlFor="incidencia-archivos"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              <Paperclip aria-hidden="true" className="size-3.5" />
              Adjuntar archivos
              <input
                id="incidencia-archivos"
                type="file"
                multiple
                className="sr-only"
                onChange={handleArchivos}
              />
            </label>

            {archivos.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {archivos.map((archivo, index) => (
                  <li
                    key={`${archivo.name}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Paperclip
                        aria-hidden="true"
                        className="size-3.5 shrink-0 text-slate-400"
                      />
                      <span className="truncate text-slate-700">
                        {archivo.name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {(archivo.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removerArchivo(index)}
                      className="flex size-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600"
                      aria-label={`Quitar ${archivo.name}`}
                    >
                      <X aria-hidden="true" className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isSubmitting}
            size="sm"
            className="h-8 px-3"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!puedeEnviar}
            size="sm"
            className="h-8 px-3"
          >
            {isSubmitting ? (
              <>
                <Spinner className="size-3.5" />
                Creando...
              </>
            ) : (
              "Crear incidencia"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
