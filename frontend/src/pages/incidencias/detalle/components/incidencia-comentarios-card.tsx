import { Send } from "lucide-react"
import { useState } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import type { IncidenciaComentario } from "@/types/incidencias"
import type { Usuario } from "@/types/usuarios"

const dateTimeFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return dateTimeFormatter.format(date)
}

type IncidenciaComentariosCardProps = {
  comentarios: IncidenciaComentario[]
  usuarios: Usuario[]
  isSubmitting: boolean
  onEnviar: (contenido: string) => void
}

function getIniciales(nombre: string) {
  return nombre
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function IncidenciaComentariosCard({
  comentarios,
  usuarios,
  isSubmitting,
  onEnviar,
}: IncidenciaComentariosCardProps) {
  const [contenido, setContenido] = useState("")

  const puedeEnviar = contenido.trim().length > 0 && !isSubmitting

  const enviar = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!puedeEnviar) return
    onEnviar(contenido.trim())
    setContenido("")
  }

  return (
    <Card className="rounded-lg bg-white shadow-sm">
      <CardContent className="flex flex-col gap-3 p-3.5">
        <h2 className="text-sm font-semibold text-slate-950">
          Comentarios ({comentarios.length})
        </h2>

        {comentarios.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aún no hay comentarios. Sé el primero en responder.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {comentarios.map((comentario) => {
              const autor = usuarios.find(
                (usuario) => usuario.id === comentario.autorId
              )
              const nombre = autor?.nombre ?? "Usuario"
              return (
                <li key={comentario.id} className="flex items-start gap-2">
                  <Avatar className="size-7 bg-blue-50" size="default">
                    <AvatarFallback className="bg-blue-50 text-[10px] font-semibold text-blue-700">
                      {getIniciales(nombre)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex flex-wrap items-baseline gap-2 text-sm">
                      <span className="font-semibold text-slate-950">
                        {nombre}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formatDateTime(comentario.creadoEn)}
                      </span>
                    </div>
                    <p className="text-sm leading-snug text-slate-700">
                      {comentario.contenido}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <form
          onSubmit={enviar}
          className="flex flex-col gap-1.5 border-t border-slate-100 pt-3"
          id="incidencia-comentario-form"
        >
          <textarea
            value={contenido}
            onChange={(event) => setContenido(event.target.value)}
            placeholder="Escribe un comentario..."
            rows={2}
            className="w-full resize-y rounded-md border border-input bg-white px-2.5 py-1.5 text-sm leading-snug outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!puedeEnviar}
              size="sm"
              className="h-8 px-3"
            >
              {isSubmitting ? (
                <Spinner className="size-3.5" />
              ) : (
                <Send data-icon="inline-start" className="size-3.5" />
              )}
              Enviar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
