import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

/**
 * Skeleton placeholder mientras la primera respuesta de `/api/dashboard`
 * esta en vuelo. Mantiene la geometria de la pagina real (grid 5 KPI cards
 * + grid 3 charts + tabla) para evitar layout shift al llegar los datos.
 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Spinner aria-hidden="true" />
        Cargando dashboard...
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={`kpi-${i}`} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3 xl:gap-7">
        <SkeletonCard className="h-[330px]" />
        <SkeletonCard className="h-[330px]" />
        <SkeletonCard className="h-[330px]" />
      </section>

      <SkeletonCard className="h-48" />
    </div>
  )
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <Card className="rounded-lg bg-white shadow-sm">
      <CardContent
        className={`flex animate-pulse items-center gap-3 px-4 py-3 ${
          className ? "" : "h-20"
        }`}
      >
        <div className="size-9 rounded-md bg-slate-200" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-3 w-1/2 rounded bg-slate-200" />
          <div className="h-5 w-1/3 rounded bg-slate-200" />
        </div>
      </CardContent>
    </Card>
  )
}
