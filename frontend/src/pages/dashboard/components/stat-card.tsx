import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type StatCardProps = {
  label: string
  value: string | number
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  color: string
}

export function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <Card className="rounded-lg bg-white shadow-sm">
      <CardContent className="flex items-center gap-3 px-4 py-3">
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-md bg-slate-100",
            color
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-xs font-medium leading-snug text-slate-500">
            {label}
          </p>
          <p className="text-xl font-bold leading-none text-slate-950">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
