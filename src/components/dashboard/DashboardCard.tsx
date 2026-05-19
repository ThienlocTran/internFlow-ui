import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type DashboardCardProps = {
  label: string;
  value: string;
  helper: string;
  trend: string;
  icon: LucideIcon;
};

export function DashboardCard({ label, value, helper, trend, icon: Icon }: DashboardCardProps) {
  return (
    <Card className="h-full bg-white/90">
      <CardContent className="flex h-full flex-col justify-center p-5 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-normal">{value}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <Icon className="h-5 w-5 text-slate-700" />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{helper}</span>
          <span className="font-medium text-emerald-700">{trend}</span>
        </div>
      </CardContent>
    </Card>
  );
}
