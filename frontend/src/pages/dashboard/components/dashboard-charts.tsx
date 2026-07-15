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
} from "@/pages/dashboard/data"
import type {
  CategoriaConteo,
  TendenciaSemanal,
} from "@/services/dashboard-service"

type DashboardChartsProps = {
  byCategoria: CategoriaConteo[]
  tendenciaSemanal: TendenciaSemanal[]
  byEstadoProceso: Record<string, number>
}

/**
 * Tres graficos del dashboard alimentados por agregados del backend:
 * - Barras: incidencias por categoria (RF-08).
 * - Linea: serie semanal de incidencias creadas (RF-09).
 * - Pie: distribucion por estado de proceso (derivada de `byEstadoProceso`).
 */
export function DashboardCharts({
  byCategoria,
  tendenciaSemanal,
  byEstadoProceso,
}: DashboardChartsProps) {
  const tendencia = tendenciaSemanal.map((punto) => ({
    semana: formatearSemana(punto.semanaInicio),
    total: punto.total,
  }))

  const pieData = ["PENDIENTE", "EN_PROCESO", "FINALIZADA"]
    .map((codigo) => ({
      name: statusLabels[codigo] ?? codigo,
      value: byEstadoProceso[codigo] ?? 0,
    }))
    .filter((item) => item.value > 0)

  return (
    <section className="grid grid-cols-3 gap-7">
      <ChartCard title="Incidencias por Categoría">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={byCategoria} margin={{ left: 4, right: 12 }}>
            <CartesianGrid stroke={chartColors.grid} strokeDasharray="4 4" />
            <XAxis
              dataKey="categoriaNombre"
              tick={{ fill: chartColors.text, fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: chartColors.text, fontSize: 12 }}
              tickLine={false}
            />
            <Tooltip cursor={{ fill: "hsl(217 91% 50% / 0.08)" }} />
            <Bar
              dataKey="total"
              fill={chartColors.blue}
              radius={[5, 5, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Tendencia Temporal">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={tendencia} margin={{ left: 4, right: 8 }}>
            <CartesianGrid stroke={chartColors.grid} strokeDasharray="4 4" />
            <XAxis
              dataKey="semana"
              tick={{ fill: chartColors.text, fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: chartColors.text, fontSize: 12 }}
              tickLine={false}
            />
            <Tooltip />
            <Legend verticalAlign="bottom" />
            <Line
              dataKey="total"
              dot={{
                fill: "white",
                r: 5,
                stroke: chartColors.blue,
                strokeWidth: 2,
              }}
              stroke={chartColors.blue}
              strokeWidth={2.5}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Estado General">
        <div className="flex h-full flex-col items-center justify-center gap-6">
          <ResponsiveContainer height={220} width="100%">
            <PieChart>
              <Pie
                cx="50%"
                cy="50%"
                data={pieData}
                dataKey="value"
                innerRadius={64}
                outerRadius={104}
                paddingAngle={5}
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

          <div className="flex max-w-[520px] flex-wrap justify-center gap-x-4 gap-y-2">
            {pieData.map((item, index) => (
              <div
                className="flex items-center gap-2 text-sm text-slate-500"
                key={item.name}
              >
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: pieColors[index] }}
                />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>
    </section>
  )
}

function formatearSemana(semanaInicio: string): string {
  // semanaInicio viene como YYYY-MM-DD (LocalDate lunes). Mostramos "dd MMM".
  const [, mm, dd] = semanaInicio.split("-")
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
