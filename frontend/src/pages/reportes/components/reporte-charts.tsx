import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { ChartCard } from "@/pages/dashboard/components/chart-card"
import {
  chartColors,
  pieColors,
  statusLabels,
} from "@/pages/reportes/data"
import type {
  ReporteConteoCategoria,
  ReporteResumenAgente,
  ReporteTendencia,
} from "@/types/reportes"

type ReporteChartsProps = {
  byEstadoProceso: Record<string, number>
  byCategoria: ReporteConteoCategoria[]
  tendencia: ReporteTendencia[]
  /** Lista vacia para USUARIO; en ese caso la card no se renderiza. */
  resumenPorAgente: ReporteResumenAgente[]
  /** Etiqueta humana de la granularidad para el subtitulo de tendencia. */
  granularidad: string
}

/**
 * Cuatro visualizaciones del reporte, alimentadas por agregados del backend.
 * Series vacias muestran explicit empty state (no se inventan puntos),
 * siguiendo la guia del design §3.3 y la regla 'no fabricated data'.
 */
export function ReporteCharts({
  byEstadoProceso,
  byCategoria,
  tendencia,
  resumenPorAgente,
  granularidad,
}: ReporteChartsProps) {
  const tendenciaPoints = tendencia.map((punto) => ({
    bucket: formatearBucket(punto.bucketInicio),
    total: punto.total,
  }))

  const pieData = ["PENDIENTE", "EN_PROCESO", "FINALIZADA"]
    .map((codigo) => ({
      name: statusLabels[codigo] ?? codigo,
      value: byEstadoProceso[codigo] ?? 0,
    }))
    .filter((item) => item.value > 0)

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
      <ChartCard title="Estado de proceso">
        {pieData.length === 0 ? (
          <EmptyState texto="Sin datos en el rango seleccionado." />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <ResponsiveContainer height={220} width="100%">
              <PieChart>
                <Pie
                  cx="50%"
                  cy="50%"
                  data={pieData}
                  dataKey="value"
                  innerRadius={48}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      fill={pieColors[index]}
                      key={`${entry.name}-${entry.value}`}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex max-w-[420px] flex-wrap justify-center gap-x-3 gap-y-1.5">
              {pieData.map((item, index) => (
                <div
                  className="flex items-center gap-1.5 text-xs text-slate-500"
                  key={item.name}
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: pieColors[index] }}
                  />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ChartCard>

      <ChartCard title="Incidencias por categoria">
        {byCategoria.length === 0 ? (
          <EmptyState texto="Sin datos en el rango seleccionado." />
        ) : (
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={byCategoria} margin={{ left: 4, right: 12 }}>
              <CartesianGrid stroke={chartColors.grid} strokeDasharray="4 4" />
              <XAxis
                dataKey="categoriaNombre"
                tick={{ fill: chartColors.text, fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: chartColors.text, fontSize: 11 }}
                tickLine={false}
              />
              <Tooltip cursor={{ fill: "hsl(217 91% 50% / 0.08)" }} />
              <Bar
                dataKey="total"
                fill={chartColors.blue}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title={`Tendencia (${granularidad.toLowerCase()})`}>
        {tendenciaPoints.length === 0 ? (
          <EmptyState texto="Sin datos en el rango seleccionado." />
        ) : (
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={tendenciaPoints} margin={{ left: 4, right: 8 }}>
              <CartesianGrid stroke={chartColors.grid} strokeDasharray="4 4" />
              <XAxis
                dataKey="bucket"
                tick={{ fill: chartColors.text, fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: chartColors.text, fontSize: 11 }}
                tickLine={false}
              />
              <Tooltip />
              <Legend verticalAlign="bottom" />
              <Line
                dataKey="total"
                dot={{
                  fill: "white",
                  r: 4,
                  stroke: chartColors.blue,
                  strokeWidth: 2,
                }}
                stroke={chartColors.blue}
                strokeWidth={2.5}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {resumenPorAgente.length > 0 ? (
        <ChartCard title="Resumen por agente">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              data={resumenPorAgente}
              margin={{ left: 4, right: 12 }}
            >
              <CartesianGrid stroke={chartColors.grid} strokeDasharray="4 4" />
              <XAxis
                dataKey="agenteNombre"
                tick={{ fill: chartColors.text, fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: chartColors.text, fontSize: 11 }}
                tickLine={false}
              />
              <Tooltip cursor={{ fill: "hsl(217 91% 50% / 0.08)" }} />
              <Legend verticalAlign="bottom" />
              <Bar
                dataKey="resueltas"
                fill={chartColors.green}
                radius={[4, 4, 0, 0]}
                stackId="a"
              />
              <Bar
                dataKey="enProceso"
                fill={chartColors.blue}
                radius={[4, 4, 0, 0]}
                stackId="a"
              />
              <Bar
                dataKey="pendientes"
                fill={chartColors.orange}
                radius={[4, 4, 0, 0]}
                stackId="a"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}
    </section>
  )
}

function EmptyState({ texto }: { texto: string }) {
  return (
    <div className="flex h-full items-center justify-center text-xs text-slate-500">
      {texto}
    </div>
  )
}

function formatearBucket(bucketInicio: string): string {
  // bucketInicio viene como YYYY-MM-DD. Mostramos "dd MMM".
  const [, mm, dd] = bucketInicio.split("-")
  const meses = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ]
  const mes = meses[Number(mm) - 1] ?? ""
  return `${Number(dd)} ${mes}`
}
