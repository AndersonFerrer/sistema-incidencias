import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Timer,
  TrendingUp,
} from "lucide-react"
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

import { PriorityBadge, StatusBadge } from "@/components/dashboard/status-badges"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  categoryData,
  incidents,
  statusLabels,
  trendData,
  type IncidentStatus,
} from "@/data/dashboard-data"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/auth-store"

const chartGrid = "hsl(214 32% 91%)"
const chartText = "hsl(220 13% 46%)"
const blue = "hsl(217 91% 50%)"
const blueDark = "hsl(217 91% 40%)"
const green = "hsl(142 71% 45%)"
const orange = "hsl(38 92% 50%)"
const red = "hsl(0 72% 51%)"
const slate = "hsl(220 14% 75%)"

const stats = [
  {
    label: "Total Incidencias",
    value: incidents.length,
    icon: AlertTriangle,
    color: "text-blue-600",
  },
  {
    label: "Solicitudes por revisar",
    value: incidents.filter((incident) => incident.status === "solicitada")
      .length,
    icon: AlertTriangle,
    color: "text-slate-900",
  },
  {
    label: "Pendientes",
    value: incidents.filter((incident) => incident.status === "pendiente")
      .length,
    icon: Clock,
    color: "text-orange-500",
  },
  {
    label: "En Proceso",
    value: incidents.filter((incident) => incident.status === "en_proceso")
      .length,
    icon: TrendingUp,
    color: "text-blue-600",
  },
  {
    label: "Finalizadas",
    value: incidents.filter((incident) => incident.status === "finalizada")
      .length,
    icon: CheckCircle2,
    color: "text-green-600",
  },
]

const pieOrder: IncidentStatus[] = [
  "solicitada",
  "aceptada",
  "pendiente",
  "en_proceso",
  "finalizada",
  "rechazada",
]

const pieColors = [slate, blue, orange, blueDark, green, red]

const pieData = pieOrder
  .map((status) => ({
    name: statusLabels[status],
    value: incidents.filter((incident) => incident.status === status).length,
  }))
  .filter((item) => item.value > 0)

const recentIncidents = [...incidents]
  .sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  .slice(0, 5)

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  color: string
}) {
  return (
    <Card className="h-32 rounded-lg bg-white shadow-sm">
      <CardContent className="flex h-full items-center gap-5 px-7">
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-lg bg-slate-100",
            color
          )}
        >
          <Icon aria-hidden="true" className="size-6" />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-base font-medium leading-snug text-slate-500">
            {label}
          </p>
          <p className="text-3xl font-bold leading-none text-slate-950">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ChartCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="h-[432px] rounded-lg bg-white shadow-sm">
      <CardHeader className="px-7 pt-8">
        <CardTitle className="text-base font-semibold text-slate-950">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[330px] px-7 pb-7">{children}</CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const displayName = user?.nombre ?? "Carlos Méndez"

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Dashboard
        </h1>
        <p className="text-base text-slate-500">
          Bienvenido, {displayName}. Aquí tienes el resumen de incidencias.
        </p>
      </section>

      <section className="grid grid-cols-5 gap-5">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
        <StatCard
          color="text-slate-950"
          icon={Timer}
          label="Tiempo Prom. Resolución"
          value="2.1 días"
        />
      </section>

      <section className="grid grid-cols-3 gap-7">
        <ChartCard title="Incidencias por Categoría">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={categoryData} margin={{ left: 4, right: 12 }}>
              <CartesianGrid stroke={chartGrid} strokeDasharray="4 4" />
              <XAxis
                dataKey="name"
                tick={{ fill: chartText, fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: chartText, fontSize: 12 }}
                tickLine={false}
              />
              <Tooltip cursor={{ fill: "hsl(217 91% 50% / 0.08)" }} />
              <Bar dataKey="cantidad" fill={blue} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tendencia Temporal">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={trendData} margin={{ left: 4, right: 8 }}>
              <CartesianGrid stroke={chartGrid} strokeDasharray="4 4" />
              <XAxis
                dataKey="week"
                tick={{ fill: chartText, fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: chartText, fontSize: 12 }}
                tickLine={false}
              />
              <Tooltip />
              <Legend verticalAlign="bottom" />
              <Line
                dataKey="creadas"
                dot={{ fill: "white", r: 5, stroke: blue, strokeWidth: 2 }}
                stroke={blue}
                strokeWidth={2.5}
                type="monotone"
              />
              <Line
                dataKey="resueltas"
                dot={{ fill: "white", r: 5, stroke: green, strokeWidth: 2 }}
                stroke={green}
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

      <Card className="rounded-lg bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b px-7 py-6">
          <CardTitle className="text-base font-semibold text-slate-950">
            Incidencias Recientes
          </CardTitle>
          <Button size="sm" variant="link">
            Ver todas
            <ArrowRight data-icon="inline-end" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-14 px-7 text-base text-slate-500">
                  ID
                </TableHead>
                <TableHead className="h-14 text-base text-slate-500">
                  Título
                </TableHead>
                <TableHead className="h-14 text-base text-slate-500">
                  Estado
                </TableHead>
                <TableHead className="h-14 text-base text-slate-500">
                  Prioridad
                </TableHead>
                <TableHead className="h-14 text-base text-slate-500">
                  Asignado
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentIncidents.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell className="px-7 font-mono text-sm text-slate-500">
                    {incident.id}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-950">
                    {incident.title}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={incident.status} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={incident.priority} />
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {incident.assignedTo ?? "Sin asignar"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
