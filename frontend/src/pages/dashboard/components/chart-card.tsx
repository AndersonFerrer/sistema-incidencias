import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ChartCardProps = {
  title: string
  children: React.ReactNode
}

export function ChartCard({ title, children }: ChartCardProps) {
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
