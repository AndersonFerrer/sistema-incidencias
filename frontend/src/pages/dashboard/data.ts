import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Timer,
  TrendingUp,
} from "lucide-react"

export type IncidentStatus =
  | "solicitada"
  | "aceptada"
  | "pendiente"
  | "en_proceso"
  | "finalizada"
  | "rechazada"

export type IncidentPriority = "baja" | "media" | "alta"

export type Incident = {
  id: string
  title: string
  status: IncidentStatus
  priority: IncidentPriority
  category: string
  assignedTo: string | null
  createdAt: string
  resolvedAt?: string
}

export const incidents: Incident[] = [
  {
    id: "INC-011",
    title: "No puedo acceder al portal de clientes",
    status: "solicitada",
    priority: "media",
    category: "Portal clientes",
    assignedTo: null,
    createdAt: "2026-03-28T10:30:00",
  },
  {
    id: "INC-012",
    title: "Solicito reposición de credenciales",
    status: "aceptada",
    priority: "baja",
    category: "Accesos",
    assignedTo: "Ana García",
    createdAt: "2026-03-28T09:10:00",
  },
  {
    id: "INC-010",
    title: "Falla en backup nocturno",
    status: "pendiente",
    priority: "alta",
    category: "Infraestructura",
    assignedTo: "Ana García",
    createdAt: "2026-03-21T16:40:00",
  },
  {
    id: "INC-007",
    title: "VPN no conecta desde remoto",
    status: "pendiente",
    priority: "alta",
    category: "Redes",
    assignedTo: "Ana García",
    createdAt: "2026-03-21T11:15:00",
  },
  {
    id: "INC-013",
    title: "Pago duplicado en factura",
    status: "rechazada",
    priority: "media",
    category: "Pagos in-app",
    assignedTo: null,
    createdAt: "2026-03-20T12:00:00",
  },
  {
    id: "INC-009",
    title: "Orden de compra no sincroniza",
    status: "en_proceso",
    priority: "media",
    category: "Órdenes de compra",
    assignedTo: "Carlos Méndez",
    createdAt: "2026-03-14T15:20:00",
  },
  {
    id: "INC-008",
    title: "Actualización de datos de nómina",
    status: "en_proceso",
    priority: "baja",
    category: "Nómina",
    assignedTo: "Carlos Méndez",
    createdAt: "2026-03-14T13:00:00",
  },
  {
    id: "INC-006",
    title: "Error al generar reporte mensual",
    status: "finalizada",
    priority: "media",
    category: "Reportes",
    assignedTo: "Luis Torres",
    createdAt: "2026-03-14T08:40:00",
    resolvedAt: "2026-03-16T11:20:00",
  },
  {
    id: "INC-005",
    title: "Validación de boletas incompleta",
    status: "finalizada",
    priority: "alta",
    category: "Nómina",
    assignedTo: "Luis Torres",
    createdAt: "2026-03-10T09:00:00",
    resolvedAt: "2026-03-12T12:00:00",
  },
  {
    id: "INC-004",
    title: "Aplicativo de compras lento",
    status: "aceptada",
    priority: "media",
    category: "Órdenes de compra",
    assignedTo: "Ana García",
    createdAt: "2026-03-07T10:00:00",
  },
  {
    id: "INC-003",
    title: "Carga masiva de usuarios falla",
    status: "finalizada",
    priority: "baja",
    category: "Accesos",
    assignedTo: "Carlos Méndez",
    createdAt: "2026-03-01T08:00:00",
    resolvedAt: "2026-03-03T10:30:00",
  },
  {
    id: "INC-002",
    title: "Revisión de permisos por rol",
    status: "en_proceso",
    priority: "baja",
    category: "Accesos",
    assignedTo: "Carlos Méndez",
    createdAt: "2026-03-01T07:40:00",
  },
  {
    id: "INC-001",
    title: "Solicitud inicial de ambiente",
    status: "solicitada",
    priority: "media",
    category: "Infraestructura",
    assignedTo: null,
    createdAt: "2026-03-01T07:00:00",
  },
]

export const categoryData = [
  { name: "Nómina", cantidad: 4 },
  { name: "Pagos in-app", cantidad: 2 },
  { name: "Accesos", cantidad: 1 },
  { name: "Portal", cantidad: 1 },
  { name: "Órdenes de compra", cantidad: 2 },
  { name: "Reportes", cantidad: 2 },
  { name: "Redes", cantidad: 1 },
]

export const trendData = [
  { week: "14 mar", creadas: 1, resueltas: 1 },
  { week: "21 mar", creadas: 4, resueltas: 2 },
  { week: "28 mar", creadas: 8, resueltas: 0 },
]

export const statusLabels: Record<IncidentStatus, string> = {
  solicitada: "Solicitada",
  aceptada: "Aceptada",
  pendiente: "Pendiente",
  en_proceso: "En Proceso",
  finalizada: "Finalizada",
  rechazada: "Rechazada",
}

export const priorityLabels: Record<IncidentPriority, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
}

export const dashboardStats = [
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
  {
    label: "Tiempo Prom. Resolución",
    value: "2.1 días",
    icon: Timer,
    color: "text-slate-950",
  },
]

export const chartColors = {
  grid: "hsl(214 32% 91%)",
  text: "hsl(220 13% 46%)",
  blue: "hsl(217 91% 50%)",
  blueDark: "hsl(217 91% 40%)",
  green: "hsl(142 71% 45%)",
  orange: "hsl(38 92% 50%)",
  red: "hsl(0 72% 51%)",
  slate: "hsl(220 14% 75%)",
}

const pieOrder: IncidentStatus[] = [
  "solicitada",
  "aceptada",
  "pendiente",
  "en_proceso",
  "finalizada",
  "rechazada",
]

export const pieColors = [
  chartColors.slate,
  chartColors.blue,
  chartColors.orange,
  chartColors.blueDark,
  chartColors.green,
  chartColors.red,
]

export const pieData = pieOrder
  .map((status) => ({
    name: statusLabels[status],
    value: incidents.filter((incident) => incident.status === status).length,
  }))
  .filter((item) => item.value > 0)

export const recentIncidents = [...incidents]
  .sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  .slice(0, 5)
