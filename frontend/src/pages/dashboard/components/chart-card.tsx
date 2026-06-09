import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ChartCardProps = {
  title: string;
  children: React.ReactNode;
};

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <Card className="rounded-lg bg-white shadow-sm">
      <CardHeader className="px-7">
        <CardTitle className="text-base font-semibold text-slate-950">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[330px] px-7">{children}</CardContent>
    </Card>
  );
}
