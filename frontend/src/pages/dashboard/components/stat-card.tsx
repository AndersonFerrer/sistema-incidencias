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
