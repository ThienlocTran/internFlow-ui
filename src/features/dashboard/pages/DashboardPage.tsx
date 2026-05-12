import {
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ImageUp,
  Percent,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ProgressCard } from "@/components/dashboard/ProgressCard";
import { StatisticsChart } from "@/components/dashboard/StatisticsChart";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorState } from "@/components/common/ErrorState";
import { useAuthStore } from "@/store/auth-store";
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";

const metricIcons = [ClipboardCheck, Target, Clock3, Percent];

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { data, isLoading, error } = useDashboardSummary();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message="Dashboard data could not be loaded." />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-lg border bg-white/80 p-6 shadow-sm backdrop-blur-xl md:flex-row md:items-center">
        <div>
          <Badge tone="success">On track</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">
            Welcome back, {user?.fullName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Your internship attendance is progressing well. Keep weekly quota balanced and upload proof before checkout.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button>
            <CheckCircle2 className="h-4 w-4" />
            Check in
          </Button>
          <Button variant="outline" className="bg-white">
            <CalendarPlus className="h-4 w-4" />
            Plan shifts
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric, index) => (
          <DashboardCard key={metric.label} {...metric} icon={metricIcons[index]} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card className="bg-white/90">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Weekly attendance</CardTitle>
              <CardDescription>Shift completion across the current week.</CardDescription>
            </div>
            <Button variant="outline" className="bg-white">
              View report
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <StatisticsChart />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <ProgressCard
            title="Weekly quota"
            description="Target for your role this week."
            value={data.weeklyProgress}
            footer="5 of 6 shifts"
          />
          <ProgressCard
            title="Internship quota"
            description="Total company shifts completed."
            value={data.quotaProgress}
            footer="38 of 60 shifts"
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Recent attendance</CardTitle>
            <CardDescription>Latest checkin and checkout records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentAttendance.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{item.shift}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={item.status === "CHECKED_OUT" ? "success" : "warning"}>{item.status}</Badge>
                  <span className="text-sm text-muted-foreground">{item.proof}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-slate-950 text-white">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription className="text-slate-300">Common workflows for today.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: ClipboardCheck, label: "Start checkin" },
              { icon: ImageUp, label: "Upload TimeMark proof" },
              { icon: CalendarPlus, label: "Register compensation shift" },
            ].map((action) => (
              <button
                key={action.label}
                className="flex w-full items-center justify-between rounded-md bg-white/10 px-4 py-3 text-sm font-medium transition-colors hover:bg-white/15"
              >
                <span className="flex items-center gap-3">
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
